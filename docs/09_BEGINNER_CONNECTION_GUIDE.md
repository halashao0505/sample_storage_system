# 09 别人如何连接平台并发送数据

## 1. 先分清谁是谁

```text
你的样品平台电脑（服务端）
  地址：127.0.0.1:3200 或 局域网IP:3200
  作用：接收、校验、保存最新 JSON
                   ▲
                   │ HTTP/1.1 持久连接，每 3 秒一帧
                   │
对方的 XAFS/XRD 控制程序（客户端）
  作用：读取自己已有的设备状态，通过 SDK 发送 JSON
```

“别人连接你”不是让对方访问 PLC，也不是让网页连接对方设备。对方只需要知道你的样品平台接口地址和写入令牌。

## 2. 双方程序在同一台电脑

你的平台双击 `启动样品平台.bat`。对方代码使用：

```python
client = SamplePlatformClient("http://127.0.0.1:3200")
client.publish_snapshot("xafs", frame)
```

`127.0.0.1` 永远表示“当前这台电脑”，其它电脑无法访问，因此同机模式最安全。

## 3. 双方程序在不同电脑

假设：

- 样品平台电脑局域网 IP：`192.168.1.20`；
- XAFS 控制电脑局域网 IP：`192.168.1.30`；
- 双方在同一个可信实验室局域网。

在样品平台电脑的 PowerShell 中启动：

```powershell
$env:SAMPLE_PLATFORM_API_HOST="0.0.0.0"
$env:SAMPLE_PLATFORM_API_TOKEN="请换成一段足够长的随机令牌"
python main.py
```

含义：

- `0.0.0.0`：允许本机所有网卡接收连接；
- `SAMPLE_PLATFORM_API_TOKEN`：保护 POST 写接口；
- `3200`：默认 JSON 通信端口；
- 终端关闭后服务也会停止。

然后对方控制程序写：

```python
client = SamplePlatformClient(
    "http://192.168.1.20:3200",
    api_token="请填写服务端完全相同的令牌",
)
client.publish_snapshot("xafs", frame)
```

对方可以先在浏览器打开 `http://192.168.1.20:3200/api/v1/health`。能看到 `"status": "ok"`，说明网络和服务地址正确。

如果打不开，依次检查：

1. 平台服务是否还在运行；
2. IP 是否写成样品平台电脑的 IPv4 地址；
3. 两台电脑是否能互相访问；
4. Windows 防火墙是否允许可信专用网络中的 TCP 3200 入站；
5. 单位网络是否禁止设备间直接访问。

不要直接把 3200 暴露到互联网。普通 HTTP 中的令牌不是加密传输；跨不可信网络时应使用单位 VPN、反向代理 HTTPS 或其它受管安全通道。

## 4. 对方到底发送什么

对方调用：

```python
result = client.publish_snapshot("xafs", frame)
```

SDK 内部做四件事：

1. 把 `frame` 从 Python dict 编码成 UTF-8 JSON；
2. 发送到 `POST /api/v1/dashboard/xafs`；
3. 等待服务端校验和保存；
4. 把服务端 JSON 响应重新转换为 Python dict。

完整字段见 `sdk/README.md`，可直接复制 `sdk/examples/xafs_snapshot.json` 或 `xrd_snapshot.json`，再把里面的示例值替换成真实状态。

## 5. 长连接是怎样工作的

当前采用 HTTP/1.1 Keep-Alive：

```text
第一次 publish_snapshot
  → 建立 TCP 连接
  → 发送 JSON
  → 收到响应

3 秒后的下一次 publish_snapshot
  → 复用同一条 TCP 连接
  → 发送下一帧 JSON
  → 收到响应
```

它属于持久连接，但不是 WebSocket。对于“每 3 秒一帧、每次都要知道服务端是否收到了”的仪器状态数据，HTTP/1.1 更容易调试，也不需要第三方依赖。

如果路由器、防火墙或服务端关闭连接：

- SDK 当前请求会自动重新建立连接并重试一次；
- 之后仍继续复用新连接；
- 连续 10 秒没有任何快照或心跳，网页显示通讯中断；
- 恢复发送后，网页下一轮 3 秒刷新会自动恢复在线。

关键用法是：Client 必须只创建一次。

```python
# 正确：启动时创建一次，循环中重复使用。
client = SamplePlatformClient("http://127.0.0.1:3200")
while running:
    client.publish_snapshot("xafs", frame)

# 不推荐：每 3 秒重新创建 Client，就无法复用连接。
while running:
    SamplePlatformClient("http://127.0.0.1:3200").publish_snapshot("xafs", frame)
```

## 6. 带逐段注释的完整代码

请从 `sdk/examples/annotated_xafs_sender.py` 开始看。里面对导入、读取状态、构造事件 ID、创建长连接、3 秒循环、异常处理和关闭连接都写了中文注释。

真实 Qt 控制程序不要直接运行该文件中的无限循环，因为会阻塞界面线程。后续接入时应由现有 `QTimer`、采集工作线程或状态发布线程每 3 秒调用一次 `publish_snapshot()`。
