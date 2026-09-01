@echo off
setlocal
set "SAMPLE_PLATFORM_API_HOST=0.0.0.0"

echo Starting Sample Platform for local and LAN access.
set "SAMPLE_PLATFORM_API_TOKEN="
set /p "SAMPLE_PLATFORM_API_TOKEN=Write token (required): "
if "%SAMPLE_PLATFORM_API_TOKEN%"=="" (
    echo Token is required. Nothing was started.
    pause
    exit /b 1
)

call "%~dp0_start_platform.cmd"
pause
