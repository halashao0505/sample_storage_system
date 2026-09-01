@echo off
setlocal

rem 本脚本只在“平台主机”上运行一次。
rem 0.0.0.0 表示允许同一局域网中的设备电脑和显示屏电脑访问本机端口。
set "SAMPLE_PLATFORM_API_HOST=0.0.0.0"

echo.
echo 将启动局域网样品平台：
echo   JSON 通讯接口：3200
echo   XAFS 显示界面：1002
echo   XRD  显示界面：1001
echo.
echo 请设置一个仅提供给 XAFS/XRD 控制程序的写入令牌。
echo 显示屏只读访问 1001/1002，不需要填写此令牌。
set /p "SAMPLE_PLATFORM_API_TOKEN=请输入写入令牌："

if "%SAMPLE_PLATFORM_API_TOKEN%"=="" (
    echo 未填写令牌，已取消启动。
    pause
    exit /b 1
)

rem 调用原有一键启动脚本。新开的 API 子窗口会继承上面的局域网配置。
call "%~dp0启动样品平台.bat"
