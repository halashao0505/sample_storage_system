@echo off
setlocal
set "PLATFORM_HOST=%~1"

if "%PLATFORM_HOST%"=="" set /p "PLATFORM_HOST=Platform host IPv4: "
if "%PLATFORM_HOST%"=="" (
    echo No host was entered.
    pause
    exit /b 1
)

start "" "http://%PLATFORM_HOST%:1001/"
