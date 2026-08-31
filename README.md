# Sample Storage System

浙江工业大学样品测试平台。当前网页为 XAFS 与 XRD 两套独立端口的只读阅览界面。

## 规划文档

1. [产品范围与总体大纲](docs/01_PRODUCT_SCOPE.md)
2. [系统架构与模块职责](docs/02_SYSTEM_ARCHITECTURE.md)
3. [数据模型与文件处理](docs/03_DATA_AND_FILES.md)
4. [XAFS 接入与 API 契约](docs/04_INTEGRATION_AND_API.md)
5. [网页信息架构与视觉规范](docs/05_WEB_DESIGN.md)
6. [实施路线图与验收标准](docs/06_ROADMAP.md)
7. [DB 与 JSON 读取扩展规划](docs/07_LEGACY_DB_JSON_COMPATIBILITY.md)
8. [JSON 通信接口与 SDK](docs/08_JSON_SDK_AND_COMMUNICATION.md)

## 已确定的原则

- 建设的是“样品测试运营平台”，不是普通 CRUD 后台。
- 平台公共业务核心同时支持 XAFS、XRD，后续新增谱仪时不复制样品系统。
- 一个样品可以有多个测试任务；任务、实际执行记录和结果文件分别建模。
- 采用模块化单体架构，前后端分离开发，避免微服务带来的部署和运维负担。
- 网页负责登记、排队、追踪、统计和追溯；不直接提供轴、高压、快门等危险设备控制。
- 原始测试文件不可覆盖；数据库保存结构化业务数据和文件索引。
- 平台 SQLite 是业务主库；未来通过独立读取器兼容外部 `.db` 和 `.json`，具体字段与用途等真实样例确定后再实现。
- 所有设备状态都携带来源与采集时间；通信中断不等于设备已停止。
- 离线/模拟验证与现场硬件验收分别记录。

## 本地查看网页

Windows 下直接双击根目录的 `启动样品平台.bat`。脚本会启动 JSON 接口服务、自动构建，并同时启动两套只读界面：

- XAFS：<http://localhost:3101/>
- XRD：<http://localhost:3102/>
- JSON 接口健康检查：<http://localhost:3200/api/v1/health>

不需要手动执行 `npm run build`。两个端口启动后，双击 `测试样品平台.bat` 可以检查 XAFS / XRD 是否均可访问。

如需手动运行：

```powershell
cd web
npm install
npm run build
npm run start:xafs
npm run start:xrd
```

网页每 3 秒读取一次状态。控制程序连续 10 秒没有通过 SDK 发送快照或心跳时，页面显示通讯中断并保留最后可信数据。SDK 安装、完整 JSON 参数和接入示例见 [`sdk/README.md`](sdk/README.md)。

当前后端是第一阶段只读通信网关；正式样品业务数据库、外部 DB/JSON 读取器仍按真实数据样例逐步实现。
