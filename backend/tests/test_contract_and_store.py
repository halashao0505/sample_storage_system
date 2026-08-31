from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from backend.app.contract import ContractError, validate_snapshot
from backend.app.store import SnapshotStore


def valid_snapshot() -> dict:
    return {
        "schema_version": 1, "technique": "xafs", "source_instance_id": "xafs-main-01",
        "source_event_id": "frame-1", "observed_at": "2026-08-31T10:00:00+08:00",
        "instrument": {"id": "xafs-01", "name": "XAFS-01", "connection": "online", "activeSampleId": "S-001", "currentValue": "7125.4 eV", "scanProgress": 50, "totalPoints": 100, "scannedPoints": 50, "remaining": "01:00"},
        "records": [{"id": "S-001", "name": "Ni foil", "applicant": "王五", "group": "材料组", "technique": "xafs", "instrument": "XAFS-01", "state": "running", "startedAt": "10:00", "duration": "1m", "progress": 50, "tags": []}],
        "queue": [], "trends": {"today": [10, 20], "week": [30, 40], "month": [50, 60]},
        "statistics": {
            "today": {"submitted": 4, "completed": 2, "pending": 1, "running": 1, "failed": 0},
            "week": {"submitted": 20, "completed": 16, "pending": 2, "running": 1, "failed": 1},
            "month": {"submitted": 80, "completed": 70, "pending": 6, "running": 1, "failed": 3},
        },
    }


class ContractAndStoreTests(unittest.TestCase):
    def test_rejects_path_and_body_technique_mismatch(self) -> None:
        with self.assertRaises(ContractError):
            validate_snapshot(valid_snapshot(), "xrd")

    def test_rejects_inconsistent_statistics_total(self) -> None:
        snapshot = valid_snapshot()
        snapshot["statistics"]["today"]["completed"] = 3
        with self.assertRaisesRegex(ContractError, "各状态之和"):
            validate_snapshot(snapshot, "xafs")

    def test_connected_then_disconnected_without_changing_snapshot(self) -> None:
        current = datetime(2026, 8, 31, tzinfo=timezone.utc)

        def clock() -> datetime:
            return current

        with tempfile.TemporaryDirectory() as directory:
            store = SnapshotStore(Path(directory), timeout_seconds=10, clock=clock)
            normalized = validate_snapshot(valid_snapshot(), "xafs")
            self.assertEqual(store.put("xafs", normalized)["communication"]["state"], "connected")
            current += timedelta(seconds=11)
            stale = store.read("xafs")
            self.assertEqual(stale["communication"]["state"], "disconnected")
            self.assertEqual(stale["snapshot"]["instrument"]["scannedPoints"], 50)


if __name__ == "__main__":
    unittest.main()
