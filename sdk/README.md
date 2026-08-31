# 样品测试平台 Python SDK 1.0

该 SDK 负责把 XAFS/XRD 控制程序中的**只读状态**转换为 UTF-8 JSON，发送到本机样品平台。它不包含启动、停止、运动、高压、快门、上样或下样接口。

## 1. 安装

在项目根目录执行：

```powershell
python -m pip install -e .\sdk\python
```

SDK 只使用 Python 标准库，不会额外安装网络依赖。

## 2. 最小用法

```python
from sample_platform_sdk import SamplePlatformClient, SamplePlatformError

client = SamplePlatformClient(
    "http://127.0.0.1:3200",  # JSON 接口地址
    timeout_seconds=2.0,       # 单次 HTTP 请求超时
)

try:
    client.publish_snapshot("xafs", snapshot_dict)
except SamplePlatformError as exc:
    logger.warning("样品看板上报失败: %s", exc)
```

上报失败只能影响看板，不能中止设备采集线程。建议在独立定时器或低优先级工作线程中每 3 秒调用一次。

## 3. SDK 方法

| 方法 | 参数 | 返回 | 用途 |
| --- | --- | --- | --- |
| `health()` | 无 | JSON object | 检查 3200 接口服务是否启动 |
| `get_dashboard(technique)` | `xafs` 或 `xrd` | JSON object | 读取最后快照和连接状态 |
| `publish_snapshot(technique, snapshot)` | 谱仪类型、完整快照 dict | JSON object | 上报一帧完整状态，推荐每 3 秒一次 |
| `heartbeat(technique, source_instance_id)` | 谱仪类型、来源实例 ID | JSON object | 数据完全不变时续期；不能代替首次完整快照 |

`publish_snapshot()` 会自动补充缺失的 `schema_version`、`source_event_id` 和 `observed_at`，但建议控制程序自己生成稳定的事件 ID 和真实设备观察时间。

## 4. 完整快照字段

请求根节点必须是 JSON object。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `schema_version` | integer | 是 | 当前固定为 `1` |
| `technique` | string | 是 | `xafs` 或 `xrd`，必须与 URL 一致 |
| `source_instance_id` | string | 是 | 控制程序实例身份，例如 `xafs-main-01`；程序重启后可生成新的实例 ID |
| `source_event_id` | string | 是 | 本帧唯一 ID，便于日志追踪和未来幂等处理 |
| `observed_at` | string | 是 | 数据在控制程序中形成的 ISO 8601 时间，必须带时区 |
| `instrument` | object | 是 | 当前设备与进度，见下表 |
| `records` | array | 是 | 本页显示的样品记录，最多 200 条 |
| `queue` | array | 是 | 当前谱仪待测队列，最多 100 条 |
| `trends` | object | 是 | `today/week/month` 三组趋势数组 |
| `technique_payload` | object | 否 | XAFS/XRD 专属字段；平台原样保存，不参与公共业务判断 |

### instrument

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 稳定设备 ID，例如 `xafs-01` |
| `name` | string | 是 | 页面名称，例如 `XAFS-01`、`D9-XRD-01` |
| `connection` | string | 是 | 控制程序确认的 `online` 或 `offline` |
| `activeSampleId` | string | 否 | 必须与 `records[].id` 中的当前样品对应 |
| `currentValue` | string | 是 | 已带单位的显示值，例如 `7125.4 eV` 或 `35.27°` |
| `scanProgress` | number | 是 | `0` 至 `100` |
| `totalPoints` | integer | 是 | 总扫描点数，不确定时传 `0` |
| `scannedPoints` | integer | 是 | 已完成点数，不得大于非零 `totalPoints` |
| `remaining` | string | 是 | 已格式化剩余时间，例如 `03:21`；未知传 `—` |

### records[]

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 样品稳定编号 |
| `name` | string | 是 | 样品名称 |
| `applicant` | string | 是 | 申请人，未知可传 `—` |
| `group` | string | 是 | 课题组，未知可传 `—` |
| `technique` | string | 是 | 必须与本帧 `technique` 一致 |
| `instrument` | string | 是 | 设备显示名称 |
| `state` | string | 是 | `queued/running/completed/failed` |
| `startedAt` | string | 是 | 页面显示时间；未知传 `—` |
| `duration` | string | 是 | 页面显示耗时；未知传 `—` |
| `progress` | number | 否 | `0` 至 `100` |
| `measuredAt` | string | 否 | 完成时间显示文本 |
| `tags` | string[] | 是 | 可为空数组，最多 20 项 |

### queue[]

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `position` | integer | 是 | 从 `1` 开始的队列位置 |
| `sampleId` | string | 是 | 样品编号 |
| `sampleName` | string | 是 | 样品名称 |
| `technique` | string | 是 | 必须与本帧一致 |
| `scheduledAt` | string | 是 | 预计开始时间显示文本 |
| `estimate` | string | 是 | 预计耗时显示文本 |

### trends

```json
{
  "today": [20, 25, 22, 35],
  "week": [18, 23, 20, 32],
  "month": [16, 21, 18, 29]
}
```

三组都必须存在，每组至少 1 个、最多 120 个非负数。网页按当前键盘选择直接使用对应数组，不会再自行伪造 7 日或 30 日数据。

## 5. HTTP 接口

| 方法与路径 | 鉴权 | 请求正文 | 状态码 |
| --- | --- | --- | --- |
| `GET /api/v1/health` | 无 | 无 | `200` |
| `GET /api/v1/dashboard/{xafs|xrd}` | 无 | 无 | `200` |
| `POST /api/v1/dashboard/{xafs|xrd}` | 可选令牌 | 完整快照 | `202` |
| `POST /api/v1/heartbeat/{xafs|xrd}` | 可选令牌 | 心跳 JSON | `202`；首次无快照为 `409` |

写接口可以通过环境变量 `SAMPLE_PLATFORM_API_TOKEN` 启用 Bearer Token。SDK 构造时传入相同 `api_token` 即可。

## 6. 连接与断连语义

```text
控制程序每 3 秒发送快照或心跳
        ↓
接口记录服务器接收时间
        ↓
网页每 3 秒读取一次
        ↓
连续 10 秒无新帧/心跳 → 通讯中断
```

- 断连时保留最后可信样品、进度和曲线；
- 断连不等于测试完成、失败或停止；
- 页面会显示红色“通讯中断”、暂停运行脉冲，并标明仍在显示最后数据；
- XAFS 与 XRD 分开计时，一个断连不影响另一个；
- 超时时间可通过 `SAMPLE_PLATFORM_STALE_SECONDS` 调整，默认 `10` 秒。

## 7. 示例

- 完整 XAFS JSON：`sdk/examples/xafs_snapshot.json`
- 完整 XRD JSON：`sdk/examples/xrd_snapshot.json`
- Python 发送示例：`send_xafs_snapshot.py`、`send_xrd_snapshot.py`

安装 SDK 并启动平台后可执行：

```powershell
python .\sdk\examples\send_xafs_snapshot.py
python .\sdk\examples\send_xrd_snapshot.py
```

真实接入时，只替换示例 JSON 的取值来源；不要让 SDK 直接访问 Qt 控件，也不要建立第二套 PLC、Xray 或探测器连接。

## 8. 错误响应

```json
{
  "schema_version": 1,
  "request_id": "uuid",
  "server_time": "2026-08-31T02:00:00+00:00",
  "error": {
    "code": "INVALID_JSON",
    "message": "instrument.scanProgress 超出允许范围",
    "details": {}
  }
}
```

常见错误码：`INVALID_JSON`、`UNAUTHORIZED`、`SNAPSHOT_REQUIRED`、`SOURCE_MISMATCH`、`NOT_FOUND`。
