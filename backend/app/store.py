"""线程安全的最新快照存储，并负责断连超时判断。"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SnapshotStore:
    """每种谱仪只保留最后一帧；历史数据后续进入正式数据库。"""

    def __init__(self, directory: Path, timeout_seconds: int = 10, clock: Clock = utc_now) -> None:
        self.directory = directory
        self.timeout_seconds = timeout_seconds
        self.clock = clock
        self._lock = threading.RLock()
        self._states: dict[str, dict[str, Any]] = {}
        self.directory.mkdir(parents=True, exist_ok=True)
        self._load_existing()

    def _load_existing(self) -> None:
        for technique in ("xafs", "xrd"):
            path = self.directory / f"{technique}.json"
            if not path.exists():
                continue
            try:
                value = json.loads(path.read_text(encoding="utf-8"))
                if isinstance(value, dict) and isinstance(value.get("snapshot"), dict):
                    self._states[technique] = value
            except (OSError, json.JSONDecodeError):
                continue

    def put(self, technique: str, snapshot: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            state = {"received_at": self.clock().isoformat(), "snapshot": snapshot}
            self._states[technique] = state
            self._write_atomic(technique, state)
            return self.read(technique)

    def heartbeat(self, technique: str, source_instance_id: str) -> dict[str, Any]:
        with self._lock:
            state = self._states.get(technique)
            if state is None:
                raise LookupError("尚未收到完整快照，不能只发送心跳")
            if state["snapshot"].get("source_instance_id") != source_instance_id:
                raise ValueError("心跳 source_instance_id 与最后快照不一致")
            state["received_at"] = self.clock().isoformat()
            self._write_atomic(technique, state)
            return self.read(technique)

    def read(self, technique: str) -> dict[str, Any]:
        with self._lock:
            state = self._states.get(technique)
            if state is None:
                return {"communication": {"state": "waiting", "message": "等待设备首次上报", "last_received_at": None, "age_seconds": None, "timeout_seconds": self.timeout_seconds}, "snapshot": None}
            received_at = datetime.fromisoformat(state["received_at"])
            age_seconds = max(0.0, (self.clock() - received_at).total_seconds())
            connected = age_seconds <= self.timeout_seconds
            return {
                "communication": {
                    "state": "connected" if connected else "disconnected",
                    "message": "通讯正常" if connected else "通讯中断",
                    "last_received_at": state["received_at"],
                    "age_seconds": round(age_seconds, 1),
                    "timeout_seconds": self.timeout_seconds,
                },
                "snapshot": state["snapshot"],
            }

    def _write_atomic(self, technique: str, state: dict[str, Any]) -> None:
        target = self.directory / f"{technique}.json"
        temporary = self.directory / f".{technique}.json.tmp"
        temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(target)
