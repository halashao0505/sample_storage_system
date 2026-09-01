@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo.
echo 本脚本会同时向 XRD(1001) 和 XAFS(1002) 页面发送 1 分钟演示数据。
echo 请先启动样品平台。若启动时填写了写入令牌，请在下面输入同一个令牌。
echo 未设置写入令牌时，直接按回车即可。
set /p "SAMPLE_PLATFORM_DEMO_TOKEN=写入令牌："

python "%~dp0scripts\demo_both_for_one_minute.py"
if errorlevel 1 (
    echo.
    echo 演示未正常完成，请根据上方提示检查平台服务和令牌。
)

echo.
pause
