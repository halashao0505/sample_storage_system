from __future__ import annotations

import sys
import threading
import unittest
from pathlib import Path

from http.server import ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from backend.app.main import ApiHandler  # noqa: E402
from sample_platform_sdk import SamplePlatformClient  # noqa: E402


class RecordingHandler(ApiHandler):
    """记录客户端源端口；同一 TCP 连接的源端口不会变化。"""

    client_ports: list[int] = []

    def do_GET(self) -> None:  # noqa: N802
        self.client_ports.append(self.client_address[1])
        super().do_GET()

    def log_message(self, _format: str, *_args: object) -> None:
        pass


class KeepAliveTests(unittest.TestCase):
    def test_two_requests_reuse_one_tcp_connection(self) -> None:
        RecordingHandler.client_ports.clear()
        server = ThreadingHTTPServer(("127.0.0.1", 0), RecordingHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        client = SamplePlatformClient(f"http://127.0.0.1:{server.server_port}", keep_alive=True)
        try:
            self.assertEqual(client.health()["status"], "ok")
            self.assertEqual(client.health()["status"], "ok")
            self.assertEqual(len(RecordingHandler.client_ports), 2)
            self.assertEqual(RecordingHandler.client_ports[0], RecordingHandler.client_ports[1])
        finally:
            client.close()
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
