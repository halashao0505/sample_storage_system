"""带逐段中文注释的 XAFS 持久连接示例。

运行前先安装 SDK：python -m pip install -e .\sdk\python
本文件只是通讯示例；真实接入时，把 ``read_xafs_state`` 中的模拟取值
替换成控制程序已经拥有的线程安全状态，不要重新连接 PLC 或探测器。
"""

# json：读取示例 JSON；time：每 3 秒执行一次；datetime：生成带时区时间。
import json
import time
from datetime import datetime
from pathlib import Path

# SDK 提供客户端和统一异常。控制程序只需要导入这两个名字。
from sample_platform_sdk import SamplePlatformClient, SamplePlatformError


def read_xafs_state(template: dict, sequence: int) -> dict:
    """把控制程序当前状态整理成平台 JSON。

    这里用示例数据演示。正式接入时，参数可以换成控制程序的状态对象，
    然后从该对象读取 sample_id、能量、扫描点和剩余时间。
    """
    # 深复制模板，避免本轮修改影响下一轮原始模板。
    frame = json.loads(json.dumps(template, ensure_ascii=False))

    # 每一帧必须有新的事件 ID，方便双方日志定位到同一帧。
    frame["source_event_id"] = f"xafs-frame-{sequence:08d}"

    # observed_at 表示控制程序形成这份状态的时间，必须包含本机时区。
    frame["observed_at"] = datetime.now().astimezone().isoformat()

    # 以下三行只是让示例进度发生变化；真实项目改成读取现有扫描状态。
    scanned = min(frame["instrument"]["totalPoints"], 726 + sequence)
    frame["instrument"]["scannedPoints"] = scanned
    frame["instrument"]["scanProgress"] = round(scanned / frame["instrument"]["totalPoints"] * 100, 1)
    return frame


def main() -> None:
    # 读取仓库中已经通过服务端校验的完整 XAFS JSON 模板。
    template_path = Path(__file__).with_name("xafs_snapshot.json")
    template = json.loads(template_path.read_text(encoding="utf-8"))

    # Client 只创建一次。keep_alive=True 表示后续请求尽量复用同一条 TCP 连接。
    # 如果样品平台在另一台电脑，把 127.0.0.1 换成那台电脑的局域网 IP。
    client = SamplePlatformClient(
        "http://127.0.0.1:3200",
        api_token="",       # 局域网模式填写服务端配置的同一个令牌。
        timeout_seconds=2.0,
        keep_alive=True,
    )

    sequence = 1
    print("开始每 3 秒发送一帧；按 Ctrl+C 停止。")
    try:
        while True:
            frame = read_xafs_state(template, sequence)
            try:
                # publish_snapshot 会把 Python dict 编码成 UTF-8 JSON 并 POST。
                result = client.publish_snapshot("xafs", frame)
                print(sequence, result["communication"]["state"])
            except SamplePlatformError as exc:
                # 看板不可用不能中止设备测试：记录错误，3 秒后继续重试。
                print(f"第 {sequence} 帧发送失败：{exc}")

            sequence += 1
            time.sleep(3)
    except KeyboardInterrupt:
        print("用户停止示例。")
    finally:
        # 程序退出时释放 TCP socket；连接已断开时调用也不会报错。
        client.close()


if __name__ == "__main__":
    main()
