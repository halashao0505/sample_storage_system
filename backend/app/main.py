"""样品测试平台 JSON 通信服务。

默认仅监听本机 ``127.0.0.1:3200``。网页只读 GET；XAFS/XRD 控制程序
通过 SDK POST 完整快照或心跳。本服务不会向仪器下发控制命令。
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from .contract import ContractError, TECHNIQUES, validate_heartbeat, validate_snapshot
from .store import SnapshotStore

# --------------------------- 服务配置 ---------------------------
# 这些值都可以在启动前用环境变量覆盖，因此代码不需要为每台电脑改 IP/端口。
ROOT = Path(__file__).resolve().parents[2]
HOST = os.getenv("SAMPLE_PLATFORM_API_HOST", "127.0.0.1")
PORT = int(os.getenv("SAMPLE_PLATFORM_API_PORT", "3200"))
TIMEOUT_SECONDS = int(os.getenv("SAMPLE_PLATFORM_STALE_SECONDS", "10"))
API_TOKEN = os.getenv("SAMPLE_PLATFORM_API_TOKEN", "")
STORE = SnapshotStore(ROOT / "storage" / "runtime", TIMEOUT_SECONDS)


class ApiHandler(BaseHTTPRequestHandler):
    # HTTP/1.1 默认保持 TCP 连接。SDK 每 3 秒发送一次时会复用同一条连接，
    # 省去反复 TCP 握手；连接被路由器或服务器关闭后 SDK 会自动重建。
    protocol_version = "HTTP/1.1"
    server_version = "SamplePlatformAPI/1.1"

    def do_OPTIONS(self) -> None:  # noqa: N802
        """浏览器跨端口访问前可能先发送 OPTIONS 预检。"""
        self.send_response(HTTPStatus.NO_CONTENT)
        self._cors_headers()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        """处理网页/SDK读取：健康检查或某一种谱仪的最后快照。"""
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path == "/api/v1/health":
            self._send(HTTPStatus.OK, {"status": "ok", "service": "sample-platform-api"})
            return
        technique = self._route_technique(path, "/api/v1/dashboard/")
        if technique:
            self._send(HTTPStatus.OK, STORE.read(technique))
            return
        self._error(HTTPStatus.NOT_FOUND, "NOT_FOUND", "接口不存在")

    def do_POST(self) -> None:  # noqa: N802
        """处理控制程序上报：完整看板帧或仅保持在线的心跳。"""
        # 写接口可配置令牌；读取接口保持只读，方便同机网页直接访问。
        if not self._authorized():
            self._error(HTTPStatus.UNAUTHORIZED, "UNAUTHORIZED", "写接口令牌不正确")
            return
        path = urlparse(self.path).path.rstrip("/")
        technique = self._route_technique(path, "/api/v1/dashboard/")
        heartbeat_technique = self._route_technique(path, "/api/v1/heartbeat/")
        try:
            if technique:
                # 完整帧先校验，再保存；错误 JSON 不会覆盖上一帧可信数据。
                self._send(HTTPStatus.ACCEPTED, STORE.put(technique, validate_snapshot(self._read_json(), technique)))
                return
            if heartbeat_technique:
                # 心跳只刷新接收时间，不修改样品、进度、曲线等业务字段。
                heartbeat = validate_heartbeat(self._read_json(), heartbeat_technique)
                self._send(HTTPStatus.ACCEPTED, STORE.heartbeat(heartbeat_technique, str(heartbeat["source_instance_id"])))
                return
            self._error(HTTPStatus.NOT_FOUND, "NOT_FOUND", "接口不存在")
        except ContractError as exc:
            self._error(HTTPStatus.BAD_REQUEST, "INVALID_JSON", str(exc))
        except LookupError as exc:
            self._error(HTTPStatus.CONFLICT, "SNAPSHOT_REQUIRED", str(exc))
        except ValueError as exc:
            self._error(HTTPStatus.CONFLICT, "SOURCE_MISMATCH", str(exc))
        except json.JSONDecodeError:
            self._error(HTTPStatus.BAD_REQUEST, "INVALID_JSON", "请求正文不是有效 JSON")

    def _route_technique(self, path: str, prefix: str) -> str | None:
        if not path.startswith(prefix):
            return None
        technique = path[len(prefix):].lower()
        return technique if technique in TECHNIQUES else None

    def _read_json(self) -> Any:
        """读取 UTF-8 JSON，并限制单帧大小，防止异常客户端占满内存。"""
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            raise ContractError("请求正文不能为空")
        if content_length > 1024 * 1024:
            raise ContractError("单帧 JSON 不能超过 1 MiB")
        return json.loads(self.rfile.read(content_length).decode("utf-8-sig"))

    def _authorized(self) -> bool:
        """未配置令牌时只适合同机；局域网模式建议必须配置令牌。"""
        return not API_TOKEN or self.headers.get("Authorization") == f"Bearer {API_TOKEN}"

    def _send(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        """所有响应统一包上版本、请求 ID 和服务器时间。"""
        envelope = {"schema_version": 1, "request_id": str(uuid.uuid4()), "server_time": datetime.now(timezone.utc).isoformat(), **payload}
        body = json.dumps(envelope, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _error(self, status: HTTPStatus, code: str, message: str) -> None:
        self._send(status, {"error": {"code": code, "message": message, "details": {}}})

    def _cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[{self.log_date_time_string()}] {self.address_string()} {format % args}")


def main() -> None:
    # ThreadingHTTPServer 允许 XAFS、XRD 和两个网页同时连接，互不阻塞。
    server = ThreadingHTTPServer((HOST, PORT), ApiHandler)
    print(f"样品平台 JSON 接口已启动：http://{HOST}:{PORT}/api/v1/health")
    print(f"断连判定：连续 {TIMEOUT_SECONDS} 秒未收到快照或心跳")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
