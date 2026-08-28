# 03 数据模型与文件处理

## 1. 建模原则

- 主键使用内部 UUID；人看到的是独立且唯一的业务编号；
- 所有时间在数据库保存带时区 UTC 时间，页面显示 Asia/Shanghai；
- 创建时间、状态发生时间、设备采集时间、平台接收时间分别保存；
- 参数和结果保留执行时快照，基础配置后续变化不能改写历史；
- 原始测试文件不可覆盖、不可由普通页面删除；
- 样品、任务、执行、事件、文件相互独立并通过 ID 关联。

## 2. 表结构大纲

### users

`id, username, display_name, password_hash, role, research_group_id, is_active, created_at, updated_at`

### research_groups

`id, code, name, owner_name, is_active, created_at`

### samples

`id, sample_code, external_code, name, applicant_id, research_group_id, material_type, hazard_note, description, created_at, updated_at, archived_at`

- `sample_code` 由平台生成并唯一，例如 `ZJUT-20260828-017`；
- `external_code` 保存送样方自己的编号，可为空；
- 归档代替普通删除。

### test_types

`id, technique, code, name, default_duration_s, parameter_schema_json, result_schema_json, is_active, created_at, updated_at`

`technique` 首批为 `xafs / xrd`，以后可增加其它谱仪类型。样品表不保存 technique，因为同一样品允许建立不同技术类型的任务。

### test_tasks

`id, task_code, sample_id, test_type_id, requested_by, assigned_operator_id, planned_instrument_id, priority, status, estimated_duration_s, parameters_json, source, created_at, updated_at, cancelled_at`

`parameters_json` 是任务确认时的完整参数快照，并带 `schema_version`。

### queue_entries

`id, task_id, instrument_id, position, priority, enqueued_at, estimated_start_at, estimated_finish_at, updated_by, updated_at`

- 一个未完成任务最多只有一个有效队列项；
- 位置调整在同一事务内完成；
- 每次调整写 `test_events` 和 `audit_logs`。

### test_runs

`id, run_code, task_id, instrument_id, operator_id, external_run_id, source_instance_id, status, started_at, finished_at, received_at, total_points, completed_points, outcome_summary_json, error_code, error_message, created_at, updated_at`

同一个任务允许因重试产生多个 run；最终任务状态由明确规则汇总，不能假设一任务永远只执行一次。

### test_events

`id, task_id, run_id, event_type, from_status, to_status, occurred_at, received_at, source, source_event_id, actor_id, payload_json, created_at`

- `(source, source_event_id)` 唯一，保证设备重复上报不会重复入库；
- `occurred_at` 是来源实际发生时间；`received_at` 是平台收到时间；
- 事件只追加，不允许更新事件含义。

### attachments

`id, sample_id, task_id, run_id, file_kind, original_name, relative_path, mime_type, extension, size_bytes, sha256, schema_version, parse_status, parse_error, created_by, created_at`

### instruments

`id, code, name, technique, instrument_model, location, status, integration_source, is_active, created_at, updated_at`

### instrument_snapshots

`id, instrument_id, source_instance_id, connection_state, operation_state, current_run_id, payload_json, observed_at, received_at`

快照用于短期状态和诊断，不替代测试事件。可按保留策略清理旧快照。

### audit_logs

`id, actor_id, action, entity_type, entity_id, before_json, after_json, request_id, ip_address, created_at`

DB/JSON 来源相关表暂不加入首版 migration。拿到真实样例并确认需要“一次导入、周期读取或只读展示”后，再决定是否需要来源登记和检查点表。

## 3. 编号规则

- 样品：`ZJUT-YYYYMMDD-NNN`；
- 测试任务：`TASK-YYYYMMDD-NNNN`；
- 实际执行：`RUN-YYYYMMDD-NNNN`。

编号生成必须由数据库事务保护，不能使用“查询最大值再 +1”的无锁逻辑。编号只用于展示和检索，关联使用 UUID。

## 4. 状态与时间真相

同一状态可能来自多个地方，优先级如下：

1. 具有 `source_event_id`、任务身份和设备时间的控制程序事件；
2. 实验员在平台明确确认的人工事件；
3. collector 的只读快照推断，只能标记为 `observed`，不能直接生成“已完成”；
4. 文件更新时间、进程存在、缓存值等只能用于诊断，不作为业务状态。

平台必须保存：数据源、来源实例、最后更新时间和接收延迟。

## 5. 文件分类

| `file_kind` | 内容 | 行为 |
| --- | --- | --- |
| `raw_data` | 仪器/控制程序原始输出 | 只读、计算 SHA-256、禁止覆盖 |
| `canonical_result` | 平台标准化结果 JSON | 由解析器生成，带 schema version |
| `export_csv` | 给用户查看/分析的 CSV | 可由 canonical result 重建 |
| `preview_image` | 曲线预览 PNG | 派生文件，可重建 |
| `report` | PDF/文档报告 | 记录生成工具和版本 |
| `request_snapshot` | 实际使用的完整扫描请求 JSON | 与 run 绑定，永久保留 |
| `log_excerpt` | 与失败 run 相关的受控日志片段 | 脱敏后保存 |

## 6. 存储目录

```text
storage/
├─ raw/YYYY/MM/{sample_code}/{run_code}/
├─ canonical/YYYY/MM/{sample_code}/{run_code}/
├─ derived/YYYY/MM/{sample_code}/{run_code}/
├─ reports/YYYY/MM/{sample_code}/{run_code}/
├─ quarantine/                         # 校验失败或未知文件
└─ backup/
```

数据库只保存相对于 `storage` 根目录的规范化相对路径。任何下载都通过 attachment ID 查库后解析路径，不接受浏览器传入任意文件路径。

## 7. 文件处理流水线

```text
发现/上传文件
  → 校验来源、大小、扩展名、MIME
  → 保存到临时区并计算 SHA-256
  → 原子移动到 raw 目录
  → 创建 attachment 记录
  → 按真实格式选择解析器
  → 输出 canonical result
  → 生成 CSV/预览图等派生文件
  → 发布 file_ready 或 file_failed 事件
```

解析失败不能阻止原始文件登记，也不能把整个测试任务改成失败；文件状态单独记录 `pending / parsed / unsupported / failed`。

## 8. 格式适配器

```text
modules/files/parsers/
├─ registry.py                  # extension + MIME → 解析器
├─ xafs_points_json.py          # XAFS 逐点结果
├─ xrd_gk.py                    # XRD GK；复用现有 serializer/格式定义
├─ csv_result.py                # 确认 CSV 列定义后实现
├─ gk_result.py                 # 确认 GK 格式属于本项目后实现
└─ text_metadata.py             # 只提取受控文本元数据
```

解析器统一返回：

```json
{
  "schema_version": 1,
  "test_type": "xafs",
  "axis": "energy",
  "columns": [],
  "point_count": 0,
  "summary": {},
  "warnings": []
}
```

只为真实出现且有样例文件和字段定义的格式实现解析器。不能仅凭扩展名猜测内容。

## 9. 当前 XAFS 结果的规范化方向

现有接口逐点返回 `input_axis, input_value, theta_deg, exposure_time_s, roi_events, roi_count_rate_cps` 等字段。平台的 canonical result 应原样保存关键值，不重新用另一套公式计算设备结果。

原始 MCA 是“最新快照”，不是每个扫描点的历史谱。平台不能把最新一帧误关联为每个扫描点的原始谱；若后续需要逐点 MCA，必须先扩展控制程序的数据产生和身份绑定方式。

## 10. 当前 XRD 结果的规范化方向

现有 D9 XRD 已能按 `sample_id` 绑定 `sample_name, two_theta_start, two_theta_stop, increment_theta, exposure_time, save_path`，并在测试完成后返回与 `.gk` 文件完全一致的 `gk_data` 文本。

- 平台保存原始 GK 文本时必须保持字节/换行一致，不重新拼一份“看起来相同”的格式；
- `save_path` 为空代表不落盘，不能因此中止测试或下样；平台仍可在数据 ready 后通过只读接口登记内容；
- 新样品开始时必须使上一样品的 current-data cache 失效；
- XRD canonical result 可解析为 `2theta + intensity` 序列，但原始 GK 永久保留；
- 参数和结果必须绑定具体 `sample_id/run_id`，不能使用全局最近参数。

## 11. DB 与 JSON 兼容边界

当前只确认后期需要读取 SQLite `.db` 和 `.json`，尚未确定具体文件、结构或业务含义。本阶段只保留 `data_readers` 扩展边界，不创建具体 mapping，也不把其它项目中的 DB/JSON 结构套用到本平台。

拿到真实样例后，再判断它属于样品业务、设备状态、设备配置还是测试结果，并为该来源建立独立 schema version 和 mapper。具体顺序见 `07_LEGACY_DB_JSON_COMPATIBILITY.md`。

## 12. 备份与恢复

- 每天使用 SQLite backup API 生成一致性数据库备份；
- 原始文件和数据库备份分别校验并保留清单；
- 默认保留最近 30 个日备份和 12 个完整月备份，最终以实验室制度为准；
- 每季度做一次恢复演练，不以“备份文件存在”代替恢复成功；
- 自动清理只能针对明确可重建的缓存/派生文件，原始文件和审计记录不自动删除。
