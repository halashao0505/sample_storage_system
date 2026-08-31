"""检查本机 JSON 服务以及 XAFS/XRD 两条独立读取路径。"""

import json
from urllib.request import urlopen


for path in ("health", "dashboard/xafs", "dashboard/xrd"):
    address = f"http://127.0.0.1:3200/api/v1/{path}"
    with urlopen(address, timeout=2) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if payload.get("schema_version") != 1:
        raise RuntimeError(f"接口格式错误：{address}")
    print(f"接口可访问：{address}")
