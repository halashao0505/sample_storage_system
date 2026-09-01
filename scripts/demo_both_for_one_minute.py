"""同时向 XAFS/XRD 看板发送一分钟动态演示数据。"""

from __future__ import annotations

import json
import math
import os
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from sample_platform_sdk import SamplePlatformClient, SamplePlatformError  # noqa: E402

INTERVAL_SECONDS = 3
DURATION_SECONDS = 60


def build_frame(template: dict, technique: str, sequence: int) -> dict:
    """复制模板并生成当前这一帧动态数据，不修改原始 JSON。"""
    frame = json.loads(json.dumps(template, ensure_ascii=False))
    instrument = frame["instrument"]
    step = 7 if technique == "xafs" else 9
    scanned = min(instrument["totalPoints"], instrument["scannedPoints"] + sequence * step)
    progress = round(scanned / instrument["totalPoints"] * 100, 1)

    frame["source_event_id"] = f"demo-{technique}-{sequence:04d}"
    frame["observed_at"] = datetime.now().astimezone().isoformat()
    instrument["connection"] = "online"
    instrument["scannedPoints"] = scanned
    instrument["scanProgress"] = progress
    instrument["remaining"] = f"{max(0, DURATION_SECONDS - sequence * INTERVAL_SECONDS) // 60:02d}:{max(0, DURATION_SECONDS - sequence * INTERVAL_SECONDS) % 60:02d}"

    if frame["records"]:
        frame["records"][0]["progress"] = progress

    if technique == "xafs":
        energy = 7125.4 + sequence * 3.5
        instrument["currentValue"] = f"{energy:.1f} eV"
        frame["technique_payload"]["roi_count_rate_cps"] = 18240.5 + sequence * 28
    else:
        two_theta = 35.27 + sequence * 0.08
        instrument["currentValue"] = f"{two_theta:.2f}°"
        frame["technique_payload"]["two_theta"] = round(two_theta, 2)

    return frame


def main() -> int:
    examples = ROOT / "sdk" / "examples"
    templates = {
        technique: json.loads((examples / f"{technique}_snapshot.json").read_text(encoding="utf-8"))
        for technique in ("xafs", "xrd")
    }
    client = SamplePlatformClient(
        os.getenv("SAMPLE_PLATFORM_API_URL", "http://127.0.0.1:3200"),
        api_token=os.getenv("SAMPLE_PLATFORM_DEMO_TOKEN", ""),
    )
    frame_count = math.ceil(DURATION_SECONDS / INTERVAL_SECONDS)

    try:
        client.health()
        print("演示开始：XAFS 与 XRD 每 3 秒同时更新，持续 60 秒。")
        for sequence in range(frame_count):
            for technique in ("xafs", "xrd"):
                client.publish_snapshot(technique, build_frame(templates[technique], technique, sequence))
            remaining = DURATION_SECONDS - (sequence + 1) * INTERVAL_SECONDS
            print(f"第 {sequence + 1:02d}/{frame_count} 帧已发送，剩余 {max(0, remaining):02d} 秒")
            time.sleep(INTERVAL_SECONDS)
    except KeyboardInterrupt:
        print("演示已由用户停止。")
        return 130
    except SamplePlatformError as exc:
        print(f"演示发送失败：{exc}")
        print("请确认平台已启动，并且输入了与平台相同的写入令牌。")
        return 1
    finally:
        client.close()

    print("一分钟演示结束；停止上报约 10 秒后，页面会自动显示通讯中断。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
