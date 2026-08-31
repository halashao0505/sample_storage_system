"""控制程序向样品平台发送 JSON 的 HTTP/1.1 持久连接客户端。"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from http.client import HTTPConnection, HTTPSConnection, HTTPException
from typing import Any
from urllib.parse import urlsplit

from .exceptions import SamplePlatformError


class SamplePlatformClient:
    """可直接嵌入现有 XAFS/XRD Python 程序。

    一个 ``SamplePlatformClient`` 对象对应一条可复用的 HTTP/1.1 TCP 连接。
    控制程序应在启动时创建一次，之后每 3 秒重复调用，而不是每次重新
    创建 Client。连接意外断开时，SDK 会自动重连一次。

    ``timeout_seconds`` 只是一次网络请求最长等待时间，不是网页的断连
    判定时间。网页断连阈值由服务端 ``SAMPLE_PLATFORM_STALE_SECONDS``
    控制，默认 10 秒。
    """

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:3200",
        *,
        api_token: str = "",
        timeout_seconds: float = 2.0,
        keep_alive: bool = True,
    ) -> None:
        # 解析一次地址，后续请求只发送路径，避免每 3 秒重复解析 URL。
        parsed = urlsplit(base_url.rstrip("/"))
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("base_url 必须是 http://主机:端口 或 https://主机:端口")
        if parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
            raise ValueError("base_url 只能填写服务根地址，不能包含接口路径、查询或锚点")

        self.base_url = base_url.rstrip("/")
        self.api_token = api_token
        self.timeout_seconds = timeout_seconds
        self.keep_alive = keep_alive
        self._scheme = parsed.scheme
        self._host = parsed.hostname
        self._port = parsed.port or (443 if parsed.scheme == "https" else 80)

        # HTTPConnection 在第一次 request() 时才真正建立 TCP 连接。
        self._connection: HTTPConnection | HTTPSConnection | None = None
        # 防止定时器和其它线程恰好同时使用同一个 HTTPConnection。
        self._lock = threading.Lock()

    def health(self) -> dict[str, Any]:
        """读取接口服务健康状态，不上传设备数据。"""
        return self._request("GET", "/api/v1/health")

    def get_dashboard(self, technique: str) -> dict[str, Any]:
        """读取 XAFS 或 XRD 的最后快照以及平台判定的连接状态。"""
        return self._request("GET", f"/api/v1/dashboard/{self._technique(technique)}")

    def publish_snapshot(self, technique: str, snapshot: dict[str, Any]) -> dict[str, Any]:
        """上报完整看板帧；JSON 字段定义见 ``sdk/README.md``。"""
        normalized = self._technique(technique)

        # 浅复制避免 setdefault 修改调用方原来的 dict。
        payload = dict(snapshot)
        payload.setdefault("schema_version", 1)
        payload.setdefault("technique", normalized)
        payload.setdefault("source_event_id", str(uuid.uuid4()))
        payload.setdefault("observed_at", datetime.now(timezone.utc).isoformat())
        return self._request("POST", f"/api/v1/dashboard/{normalized}", payload)

    def heartbeat(self, technique: str, source_instance_id: str, *, source_event_id: str | None = None) -> dict[str, Any]:
        """数据完全不变时续期；服务重启后仍要先发送一帧完整快照。"""
        normalized = self._technique(technique)
        payload = {
            "schema_version": 1,
            "technique": normalized,
            "source_instance_id": source_instance_id,
            "source_event_id": source_event_id or str(uuid.uuid4()),
            "observed_at": datetime.now(timezone.utc).isoformat(),
        }
        return self._request("POST", f"/api/v1/heartbeat/{normalized}", payload)

    def close(self) -> None:
        """控制程序退出时主动关闭 TCP 连接；重复调用也安全。"""
        with self._lock:
            self._close_unlocked()

    def __enter__(self) -> "SamplePlatformClient":
        """支持 ``with SamplePlatformClient() as client`` 写法。"""
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    @staticmethod
    def _technique(value: str) -> str:
        """把大小写统一，并在发请求前拦截拼写错误。"""
        technique = value.lower()
        if technique not in {"xafs", "xrd"}:
            raise ValueError("technique 仅支持 'xafs' 或 'xrd'")
        return technique

    def _new_connection(self) -> HTTPConnection | HTTPSConnection:
        """根据 http/https 创建连接对象，但此时还不会发数据。"""
        connection_type = HTTPSConnection if self._scheme == "https" else HTTPConnection
        return connection_type(self._host, self._port, timeout=self.timeout_seconds)

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        """编码 JSON、复用连接、读取响应，并在断线时自动重连一次。"""
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
        headers = {"Accept": "application/json", "Connection": "keep-alive" if self.keep_alive else "close"}
        if body is not None:
            headers["Content-Type"] = "application/json; charset=utf-8"
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"

        # 同一个 POST 最多尝试两次。快照采用“最后一帧覆盖”语义，重复发送
        # 同一 source_event_id 不会产生设备动作，因此这里重试是安全的。
        with self._lock:
            last_error: Exception | None = None
            for _attempt in range(2):
                try:
                    if self._connection is None:
                        self._connection = self._new_connection()
                    self._connection.request(method, path, body=body, headers=headers)
                    response = self._connection.getresponse()
                    raw = response.read()  # 必须读完，连接才能被下一次请求复用。
                    value = self._decode(raw)

                    if not self.keep_alive or response.getheader("Connection", "").lower() == "close":
                        self._close_unlocked()
                    if response.status >= 400:
                        message = value.get("error", {}).get("message", response.reason)
                        raise SamplePlatformError(f"接口返回 HTTP {response.status}: {message}")
                    return value
                except SamplePlatformError:
                    raise
                except (HTTPException, OSError, TimeoutError) as exc:
                    last_error = exc
                    self._close_unlocked()

            raise SamplePlatformError(f"无法连接样品平台接口 {self.base_url}: {last_error}") from last_error

    def _close_unlocked(self) -> None:
        """仅在已经持有 ``_lock`` 时调用，避免线程互相等待。"""
        if self._connection is not None:
            self._connection.close()
            self._connection = None

    @staticmethod
    def _decode(raw: bytes) -> dict[str, Any]:
        """将服务端 UTF-8 字节转换为 Python dict，并检查根节点。"""
        try:
            value = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise SamplePlatformError("接口返回的不是有效 UTF-8 JSON") from exc
        if not isinstance(value, dict):
            raise SamplePlatformError("接口 JSON 根节点必须是 object")
        return value
