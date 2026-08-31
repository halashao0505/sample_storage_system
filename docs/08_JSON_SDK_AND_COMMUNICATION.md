# 08 JSON 通信接口与 SDK

当前已实现的实时链路为：

```text
XAFS 控制程序 ─┐
                ├─ Python SDK / JSON POST → 127.0.0.1:3200 → 运行快照缓存
XRD 控制程序 ──┘                                      │
                                                      ├─ XAFS 页面 3101（3 秒 GET）
                                                      └─ XRD 页面 3102（3 秒 GET）
```

模块职责：

- `backend/app/contract.py`：JSON v1 字段校验；
- `backend/app/store.py`：最后快照、原子 JSON 缓存、超时判定；
- `backend/app/main.py`：HTTP 路由、错误结构、CORS、可选写令牌；
- `sdk/python/sample_platform_sdk/`：控制程序调用的无第三方依赖 SDK；
- `sdk/examples/`：XAFS/XRD 完整 JSON 与发送脚本；
- `web/lib/samples/api.ts`：浏览器状态读取；
- `web/components/read-only/dashboard-board.tsx`：3 秒轮询和断连显示。

接口字段、参数范围、返回值、错误码和接入代码详见 [`sdk/README.md`](../sdk/README.md)。

当前实现是只读看板通信网关，不替代后续样品业务数据库，也不实现设备控制。外部 `.db` 与未知 JSON 文件的结构仍按 `07_LEGACY_DB_JSON_COMPATIBILITY.md` 等真实样例确定后再写独立 reader。
