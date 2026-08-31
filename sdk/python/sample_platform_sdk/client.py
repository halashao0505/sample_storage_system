"""控制程序向样品平台发送 JSON 的同步客户端。"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .exceptions import SamplePlatformError


class SamplePlatformClient:
    """可直接嵌入现有 XAFS/XRD Python 程序。

    建议控制程序每 3 秒调用一次 :meth:`publish_snapshot`。业务数据没有
    变化时可调用 :meth:`heartbeat`。网络错误不会被吞掉，而是统一转换成
    ``SamplePlatformError``；调用方应记录后继续设备流程，不能让看板故障
    中止仪器采集。
    """

    def __init__(self, base_url: str = "http://127.0.0.1:3200", *, api_token: str = "", timeout_seconds: float = 2.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_token = api_token
        self.timeout_seconds = timeout_seconds

    def health(self) -> dict[str, Any]:
        """读取接口服务健康状态。"""
        return self._request("GET", "/api/v1/health")

    def get_dashboard(self, technique: str) -> dict[str, Any]:
        """读取 XAFS 或 XRD 的最后快照以及连接状态。"""
        return self._request("GET", f"/api/v1/dashboard/{self._technique(technique)}")

    def publish_snapshot(self, technique: str, snapshot: dict[str, Any]) -> dict[str, Any]:
        """上报完整看板帧；JSON 字段定义见 ``sdk/README.md``。"""
        normalized = self._technique(technique)
        payload = dict(snapshot)
        payload.setdefault("schema_version", 1)
        payload.setdefault("technique", normalized)
        payload.setdefault("source_event_id", str(uuid.uuid4()))
        payload.setdefault("observed_at", datetime.now(timezone.utc).isoformat())
        return self._request("POST", f"/api/v1/dashboard/{normalized}", payload)

    def heartbeat(self, technique: str, source_instance_id: str, *, source_event_id: str | None = None) -> dict[str, Any]:
        """数据不变时续期连接；首次接入仍必须先发送完整快照。"""
        normalized = self._technique(technique)
        payload = {
            "schema_version": 1,
            "technique": normalized,
            "source_instance_id": source_instance_id,
            "source_event_id": source_event_id or str(uuid.uuid4()),
            "observed_at": datetime.now(timezone.utc).isoformat(),
        }
        return self._request("POST", f"/api/v1/heartbeat/{normalized}", payload)

    @staticmethod
    def _technique(value: str) -> str:
        technique = value.lower()
        if technique not in {"xafs", "xrd"}:
            raise ValueError("technique 仅支持 'xafs' 或 'xrd'")
        return technique

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
        headers = {"Accept": "application/json"}
        if data is not None:
            headers["Content-Type"] = "application/json; charset=utf-8"
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"
        request = Request(f"{self.base_url}{path}", data=data, headers=headers, method=method)
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                return self._decode(response.read())
        except HTTPError as exc:
            error = self._decode(exc.read())
            message = error.get("error", {}).get("message", str(exc))
            raise SamplePlatformError(f"接口返回 HTTP {exc.code}: {message}") from exc
        except (URLError, TimeoutError, OSError) as exc:
            raise SamplePlatformError(f"无法连接样品平台接口 {self.base_url}: {exc}") from exc

    @staticmethod
    def _decode(raw: bytes) -> dict[str, Any]:
        try:
            value = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise SamplePlatformError("接口返回的不是有效 UTF-8 JSON") from exc
        if not isinstance(value, dict):
            raise SamplePlatformError("接口 JSON 根节点必须是 object")
        return value
