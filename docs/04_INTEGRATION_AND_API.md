# 04 XAFS/XRD 接入与 API 契约

> 实施状态：当前已完成看板所需的健康检查、快照读取、快照上报和心跳 4 类 JSON 接口，以及 Python SDK、3 秒网页轮询和断连显示，详见 `08_JSON_SDK_AND_COMMUNICATION.md` 与 `sdk/README.md`。本文件第 8～10 节的样品 CRUD、队列写操作、数据库接口和 SSE 属于后续业务平台范围，尚未实现。

## 1. XAFS 现有能力盘点

当前父项目已经具备：

- 完整扫描请求结构，包含 `sample / geometry / detector / scan / output`；
- `START_SINGLE_XAFS_SCAN` 启动入口；
- `GET_SINGLE_XAFS_SCAN_STATUS` 状态轮询；
- `GET_SINGLE_XAFS_SCAN_RESULTS` 逐点标量结果；
- `GET_DETECTOR_MCA` 最新 MCA 快照；
- `GET_DETECTOR_ROI_RESULT` ROI 标量；
- 协议为 4 字节大端 JSON 长度 + UTF-8 JSON 正文；
- 默认监听 `127.0.0.1:6101`。

现有扫描请求中的 `sample` 元数据已经适合作为平台身份入口，但桌面 UI 当前构造请求时仍使用空对象。现有状态主要返回：

```text
running, queued, outcome, error_message,
total_points, completed_points, input_axis
```

这足够显示扫描进度，但不足以可靠回答“当前是哪一个平台任务和样品”。

## 2. XRD 现有能力盘点

当前 D9 XRD 已具备：

- `GET_SAMPLE_REQUEST → SEND_SAMPLE_READY → SET_ACQUIRE_PARAMETERS` 的单片身份/参数握手；
- 服务端为每片样品生成 `sample_id`；
- 采集参数按 `sample_id` 保存在 `API_DCU_SAMPLE_PARAMS`；
- 参数包含样品名、2Theta 起止、步长、曝光和可选 `save_path`；
- `GET_CURRENT_SAMPLE_DATA` 在完成后返回当前样品的完整 GK 文本；
- 新样品开始时清除上一样品 current-data readiness/cache；
- 未完成时数据查询只读失败，不改变采集和下样流程。

这条身份链必须保留。平台不能把 XRD 当成 XAFS 请求的另一种字段组合，XRD 上样工位、参数握手和退样生命周期由独立 adapter 处理。

## 3. 平台接入原则

- 首版只读接入，不从网页调用 START、STOP、MOVE、SHUTTER、高压、上样或下样命令；
- 现有控制程序仍是设备动作和真实执行状态的唯一来源；
- 平台队列是业务计划，不能直接等同于设备已执行；
- 所有跨程序数据绑定到稳定的 `task_id / run_id / sample_id`；XRD 还保留其设备生成的 sample_id 作为 external_sample_id；
- XAFS/XRD collector 各自只接触允许列表内的状态和结果命令；
- 现有 DCU 端口同时存在控制命令，因此长期应提供独立只读平台契约，而不是让网页后端拥有完整控制客户端。

## 4. 统一的平台快照契约

XAFS 与 XRD 控制程序分别实现同一外层 envelope 的只读命令：

```text
GET_SAMPLE_PLATFORM_SNAPSHOT
```

建议响应：

```json
{
  "schema_version": 1,
  "source_instance_id": "xafs-main-01",
  "source_event_id": "uuid-or-monotonic-id",
  "observed_at": "2026-08-28T09:24:32.125+08:00",
  "connection_state": "online",
  "technique": "xafs",
  "instrument_code": "XAFS-01",
  "operation_state": "testing",
  "task_id": "platform-task-uuid",
  "run_id": "platform-run-uuid",
  "sample_id": "platform-sample-uuid",
  "sample_code": "ZJUT-20260828-017",
  "sample_name": "Fe2O3",
  "started_at": "2026-08-28T09:16:00+08:00",
  "finished_at": null,
  "total_points": 1000,
  "completed_points": 726,
  "input_axis": "energy",
  "current_input_value": 7125.0,
  "outcome": "running",
  "error_code": null,
  "error_message": null,
  "result_ready": false,
  "result_manifest": []
}
```

XRD 快照使用相同公共字段，并在 `technique_payload` 中提供 `two_theta, station, exposure_time_s` 等 XRD 专属字段；XAFS 则提供 `energy/theta, roi` 等字段。公共业务层不解析未知专属字段。

此命令只读内存中已经存在的业务快照，不访问 UI 控件、不创建第二套设备连接、不触发设备读写。

## 5. 请求身份绑定

平台生成测试任务后，控制程序执行时使用完整请求：

```json
{
  "schema_version": 1,
  "technique": "xafs",
  "task_type": "xafs_single_scan",
  "sample": {
    "platform_sample_id": "uuid",
    "sample_code": "ZJUT-20260828-017",
    "sample_name": "Fe2O3",
    "client_sample_id": "A001"
  },
  "tracking": {
    "platform_task_id": "uuid",
    "platform_run_id": "uuid",
    "submitted_at": "2026-08-28T09:15:20+08:00"
  },
  "geometry": {},
  "detector": {},
  "scan": {},
  "output": {}
}
```

控制程序保存请求时必须保留身份字段，状态和结果接口也要返回同一个 `run_id`。XAFS 可把 tracking/sample 元数据加入完整扫描 request；XRD adapter 把平台 ID 与 D9 `sample_id` 建立明确映射。不能用“最近创建的样品”或“当前队列第一项”反推执行身份。

## 6. 事件与幂等

collector 把快照转换为以下事件：

- `run_started`
- `run_progressed`
- `run_completed`
- `run_failed`
- `result_ready`
- `source_offline`
- `source_online`

每个来源事件必须有稳定 `source_event_id`。数据库对 `(source_instance_id, source_event_id)` 建唯一约束；重连、重试和重复轮询不会产生重复执行记录。

进度事件可限频，例如 1 秒内只保留一次最新进度；开始、完成、失败和文件事件不丢弃。

## 7. 断线语义

```text
最后快照为 testing + 来源断开
≠ completed
≠ failed
≠ stopped
```

平台显示“状态暂不可确认”，保留最后可信状态、最后更新时间和离线时长。只有控制程序明确报告结果或实验员执行带审计的人工更正后，才改变业务终态。

## 8. 平台 REST API

所有路径以 `/api/v1` 开头，响应带 `request_id`，时间使用 ISO 8601。

### Overview

```text
GET /dashboard?date=2026-08-28&technique=all
GET /dashboard/trend?from=...&to=...&technique=xrd&metric=samples&bucket=hour
GET /events/stream
```

### Samples

```text
GET    /samples
POST   /samples
GET    /samples/{sample_id}
PATCH  /samples/{sample_id}
POST   /samples/{sample_id}/archive
GET    /samples/{sample_id}/timeline
```

### Tasks and Queue

```text
POST   /samples/{sample_id}/tasks
GET    /tasks/{task_id}
PATCH  /tasks/{task_id}
POST   /tasks/{task_id}/enqueue
POST   /tasks/{task_id}/cancel
GET    /queue?technique=xrd&instrument_id=...
PUT    /queue/order
```

### Runs and Files

```text
GET    /runs?technique=xafs
GET    /runs/{run_id}
POST   /runs/{run_id}/manual-correction
GET    /runs/{run_id}/attachments
POST   /runs/{run_id}/attachments/register
GET    /attachments/{attachment_id}/download
```

### Analytics and Settings

```text
GET /analytics/summary
GET /analytics/trend
GET /analytics/breakdown
GET /instruments
GET /instruments/{instrument_id}/status
GET /test-types
POST/PATCH /test-types
```

所有列表和统计接口都支持 `technique / instrument_id` 过滤。跨谱仪汇总只聚合有共同定义的指标（样品数、任务数、耗时、等待、成功率），不合并 XAFS ROI 与 XRD 强度等不同物理量。

## 9. API 设计规则

- 列表统一使用 `page, page_size, sort, filters`；
- 写操作支持 `Idempotency-Key`；
- 乐观并发字段使用 `version`，避免两名实验员互相覆盖队列/样品；
- 错误结构统一为 `code, message, details, request_id`；
- 业务终态不通过普通 PATCH 任意改写，使用明确命令式端点；
- 附件下载返回受控文件流，不返回服务器绝对路径；
- OpenAPI 是前后端契约来源，TypeScript 类型由它生成。

## 10. SSE 事件

```text
dashboard.updated
queue.updated
sample.updated
run.started
run.progressed
run.finished
integration.state_changed
```

事件只通知“什么变了”和实体 ID，前端收到后重新查询相关资源；不在 SSE 中复制完整数据库对象。断线后前端退避重连，并先做一次 HTTP 全量刷新。SSE 事件携带 `technique` 和 `instrument_id`，前端只刷新受影响的仪器卡片和队列。

## 11. DB/JSON 读取边界

当前不规划 DB/JSON 的具体 HTTP API，只在后端保留 `data_readers` 模块位置。拿到真实样例后先确认读取目的：如果只是内部同步，不需要公开 API；如果需要人工导入预览，再单独设计来源和导入端点。

## 12. 接入验收

1. 同一个任务身份贯穿扫描请求、状态、结果和文件；
2. 重复状态消息不生成重复 run/event；
3. 控制程序重启后能识别来源实例变化；
4. 断线时平台不伪造终态；
5. 当前样品进度与真实 completed/total 一致；
6. 结果点字段与现有接口逐项一致，不在平台重新推导；
7. 现场硬件验收单独记录，不以假服务检查代替。
8. XAFS 离线不影响 XRD，XRD 离线不影响 XAFS；
9. XRD GK 内容和换行保持与现有 serializer 完全一致；
10. 后期 DB/JSON reader 的离线检查与真实来源验证分开记录。
