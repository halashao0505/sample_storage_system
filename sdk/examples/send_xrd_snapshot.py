import json
from pathlib import Path

from sample_platform_sdk import SamplePlatformClient

snapshot = json.loads(Path(__file__).with_name("xrd_snapshot.json").read_text(encoding="utf-8"))
print(SamplePlatformClient().publish_snapshot("xrd", snapshot)["communication"])
