# 02 系统架构与模块职责

## 1. 架构选择

采用 **前后端分离的模块化单体**：

- 后端：Python 3.10+、FastAPI、Pydantic、SQLAlchemy 2、Alembic；
- 前端：Vue 3、TypeScript、Vite、Vue Router、Pinia、ECharts；
- 数据库：首版 SQLite，保留迁移到 PostgreSQL 的能力；
- 实时更新：Server-Sent Events（SSE）；
- 文件：本机/局域网目录存储，数据库保存索引与校验信息；
- 谱仪：公共业务核心 + XAFS/XRD 独立适配器；
- 兼容：现有 SQLite `.db` 与 JSON 通过版本化 legacy adapter 接入；
- 部署：单台实验室 Windows 主机，前端构建产物由后端统一提供。

选择模块化单体而不是微服务，是因为当前业务、团队和部署规模不需要多进程分布式系统。模块边界仍需清楚，未来只有当独立扩缩容或故障隔离成为真实需求时才拆服务。

## 2. 系统上下文

```text
浏览器
  │ HTTPS/REST + SSE
  ▼
Sample Platform 后端
  ├─ 业务数据库（样品、任务、事件、索引）
  ├─ 结果文件存储（原始/派生/报告）
  ├─ XAFS 只读集成适配器 ── 现有 XAFS 控制程序 ── PLC/Kohzu/KETEK/SH2
  ├─ XRD 只读集成适配器  ── 现有 D9 XRD 控制程序 ── PLC/Xray/探测器/样品机构
  └─ Legacy 数据适配器   ── 现有 SQLite DB / JSON（默认只读）
```

浏览器永远不直连 PLC、Xray、探测器或现有 DCU TCP 端口。XAFS 与 XRD 的协议、连接和生命周期不能放在同一个巨型 `device.py` 中。

## 3. 仓库目录

```text
Sample_Storage_System/
├─ README.md
├─ backend/
│  ├─ pyproject.toml
│  ├─ app/
│  │  ├─ main.py                    # FastAPI 组合入口
│  │  ├─ core/
│  │  │  ├─ config.py              # 环境配置读取和校验
│  │  │  ├─ database.py            # 引擎、会话和事务基础
│  │  │  ├─ errors.py              # 统一业务错误
│  │  │  ├─ logging.py             # 日志格式和轮转
│  │  │  └─ security.py            # 登录、密码和权限基础
│  │  ├─ modules/
│  │  │  ├─ auth/                  # 用户、登录、角色
│  │  │  ├─ samples/               # 样品档案
│  │  │  ├─ tasks/                 # 测试任务和状态机
│  │  │  ├─ queue/                 # 排队、排序、预计时间
│  │  │  ├─ runs/                  # 实际执行记录和进度
│  │  │  ├─ files/                 # 附件登记、解析、下载
│  │  │  ├─ instruments/           # 设备与只读状态
│  │  │  ├─ analytics/             # 聚合统计查询
│  │  │  └─ audit/                 # 操作审计
│  │  ├─ integrations/
│  │  │  ├─ xafs/                  # XAFS 协议、快照和结果适配
│  │  │  ├─ xrd/                   # D9 XRD 协议、工位和 GK 数据适配
│  │  │  └─ data_readers/          # 后期 DB/JSON 读取扩展点
│  │  └─ shared/                   # 真正跨模块的分页、时间和 ID 工具
│  ├─ migrations/                  # Alembic 数据库版本
│  └─ tests/
│     ├─ unit/                     # 纯业务规则
│     ├─ api/                      # HTTP 契约
│     ├─ storage/                  # SQLite 事务和迁移
│     └─ integration/              # 假 XAFS 服务/协议检查
├─ frontend/
│  ├─ package.json
│  ├─ vite.config.ts
│  └─ src/
│     ├─ app/                      # 应用初始化、路由、全局守卫
│     ├─ layouts/                  # 主框架、登录框架
│     ├─ features/
│     │  ├─ overview/
│     │  ├─ queue/
│     │  ├─ samples/
│     │  ├─ history/
│     │  ├─ analytics/
│     │  └─ settings/
│     ├─ shared/
│     │  ├─ api/                   # HTTP 客户端和错误处理
│     │  ├─ components/            # Button、Card、Table、StatusTag 等
│     │  ├─ composables/           # 可复用 Vue 逻辑
│     │  ├─ types/                 # 共享 TypeScript 类型
│     │  └─ utils/                 # 时间、格式化等纯函数
│     └─ styles/
│        ├─ tokens.css             # 颜色、字号、间距、阴影
│        ├─ base.css               # reset 和基础排版
│        └─ components.css         # 少量全局组件状态
├─ storage/                        # 运行文件根目录，不提交生产内容
├─ scripts/                        # 初始化、备份、恢复和维护脚本
├─ docs/                           # 本规划与接口说明
├─ .env.example
└─ compose.yaml                    # 仅在切换 PostgreSQL/容器部署时添加
```

## 4. 后端模块内部结构

每个业务模块采用相同但非强制的文件职责：

```text
modules/samples/
├─ router.py       # URL、权限入口、请求与响应
├─ schemas.py      # Pydantic 输入/输出模型
├─ models.py       # SQLAlchemy 持久化模型
├─ repository.py   # 该模块数据库查询
├─ service.py      # 用例、事务、跨对象协调
├─ policies.py     # 状态转换/编号规则等纯业务规则（确有规则时）
└─ errors.py       # 该模块可预期业务错误（确有需要时）
```

不是每个模块都必须拥有全部文件；按实际复杂度创建，禁止空文件占位。

### 依赖规则

```text
router → service → repository/models
                 → integration port
policies 不依赖 FastAPI、SQLAlchemy、Qt、PLC 或文件系统
```

- 路由层不直接执行 SQL，不导入 XAFS 控制模块；
- Repository 不做权限判断或状态转换；
- 事务边界在 Service；
- 模块之间不能直接读取对方 Repository；通过对方 Service 或专用查询接口协作；
- XAFS 接口只通过 `integrations/xafs` 暴露的只读方法进入业务层；
- XRD 接口只通过 `integrations/xrd` 暴露的只读方法进入业务层；
- `samples/tasks/runs` 不导入 XAFS/XRD 具体控制代码，设备差异保存在参数 schema、结果 schema 和适配器中；
- API 响应不直接返回 ORM 对象。

## 5. 前端模块职责

- `features/*/pages`：路由页面，只编排该功能；
- `features/*/components`：只服务于该业务功能的组件；
- `features/*/api.ts`：该功能的后端调用；
- `features/*/store.ts`：需要跨组件保存的页面状态；
- `shared/components`：至少被两个业务功能复用且视觉语义相同的组件；
- `shared/types`：由 OpenAPI 生成或严格对齐后端契约的类型；
- `styles/tokens.css`：唯一设计变量来源。

页面不得复制后端状态机。前端可以决定“如何显示状态”，不能决定“状态是否允许转换”。

## 6. 运行进程

首版保留两个逻辑角色，可按部署合并：

1. `sample-platform`：HTTP、SSE、数据库和文件下载；
2. `instrument-collector`：按 source instance 启动 XAFS/XRD 独立 collector；

开发阶段可以在一个命令下启动；生产环境每个 collector/source 必须保证单实例，避免重复写入事件。一个谱仪离线不能阻塞另一个谱仪状态。DB/JSON reader 暂时只是扩展点，拿到真实样例并确定读取模式后再决定是否需要独立任务。耗时文件解析任务如果后来影响 API 响应，再拆为独立 worker；首版不引入 Celery/Redis。

## 7. 数据库策略

- 首版单机、低并发使用 SQLite，启用 WAL、外键和合理 busy timeout；
- 所有结构变更必须通过 Alembic migration；
- ORM 查询保持兼容 PostgreSQL，不使用只有 SQLite 才有的业务语义；
- 当出现多台应用服务器、持续高并发写入或跨主机可靠访问需求时迁移 PostgreSQL；
- 数据库迁移不是简单复制文件，必须有演练和回滚说明。

这里的“兼容 DB/JSON”不是让平台随机切换两种主库：平台业务主库保持 SQLite/PostgreSQL 之一；外部 `.db` 与 `.json` 将来由 reader 读取。来源身份、schema 和读取方式都等真实样例确定后再设计，具体边界见 `07_LEGACY_DB_JSON_COMPATIBILITY.md`。

## 8. 配置与机密

| 文件/来源 | 内容 |
| --- | --- |
| `.env.example` | 所有可配置项名称与无敏感示例 |
| `.env` | 本机连接、密钥和路径；不提交 Git |
| 数据库 settings 表 | 管理员可调整且需要审计的业务配置 |
| XAFS 现有 JSON | 继续由控制程序拥有；平台不直接修改 |

监听地址默认 `127.0.0.1`。开放局域网访问前再明确防火墙、账号、权限、TLS 和允许网段。

## 9. 日志、审计与监控

- 应用日志：启动、异常、外部连接、文件解析；按日期/大小轮转；
- 审计日志：谁在何时修改了样品、队列、任务、用户或配置；只追加；
- 集成状态：XAFS 来源、连接状态、最后成功采集时间、连续失败次数；
- 健康检查分成应用、数据库、文件目录、XAFS 来源，不能用一个“在线”概括全部；
- 日志不得记录密码、令牌或完整敏感样品说明。

## 10. 安全边界

- 网页 API 不设计运动、高压、快门写接口；
- 下载附件必须验证记录权限和解析后的安全路径，防止路径穿越；
- 上传/登记文件限制大小、扩展名、MIME 和目标目录；
- 登录密码使用成熟密码哈希库；不自行设计加密；
- 修改队列、取消任务、修改权限等操作写审计；
- 会改变历史真实性的字段不可普通覆盖，使用更正事件保留前值。

## 11. 测试分层

| 类型 | 验证内容 | 是否需要硬件 |
| --- | --- | --- |
| 领域单元测试 | 状态机、编号、队列预计时间 | 否 |
| API 契约测试 | 权限、校验、错误和响应结构 | 否 |
| 存储测试 | migration、事务、唯一约束、备份恢复 | 否 |
| 集成模拟 | 分帧协议、超时、重复事件、断线重连 | 否 |
| 现场验收 | 任务身份、状态时间、结果与真实设备一致 | 是 |

离线测试报告与现场验收报告分开保存。
