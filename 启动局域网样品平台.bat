@echo off
setlocal
set "SAMPLE_PLATFORM_API_HOST=0.0.0.0"

echo Starting Sample Platform for LAN access.
echo API: 3200   XRD: 1001   XAFS: 1002
set "SAMPLE_PLATFORM_API_TOKEN="
set /p "SAMPLE_PLATFORM_API_TOKEN=Write token (required): "
if "%SAMPLE_PLATFORM_API_TOKEN%"=="" (
    echo Token is required. Nothing was started.
    pause
    exit /b 1
)

call "%~dp0_start_platform.cmd"
pause
