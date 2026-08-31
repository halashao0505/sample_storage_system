@echo off
setlocal

rem 该脚本可以复制到“XRD 显示屏电脑”。它只打开网页，不启动后端。
rem 使用方法：双击后输入平台主机 IP；或命令行执行：打开XRD屏幕.bat 192.168.100.148
set "PLATFORM_HOST=%~1"

if "%PLATFORM_HOST%"=="" (
    echo.
    echo 请输入运行“启动局域网样品平台.bat”的平台主机 IP。
    echo 示例：192.168.100.148
    set /p "PLATFORM_HOST=平台主机 IP："
)

if "%PLATFORM_HOST%"=="" (
    echo 未填写平台主机 IP，未打开网页。
    pause
    exit /b 1
)

rem 3102 固定对应 XRD 页面；浏览器从同一台主机读取 3200 状态接口。
start "" "http://%PLATFORM_HOST%:3102/"
