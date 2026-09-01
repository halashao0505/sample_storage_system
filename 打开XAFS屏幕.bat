@echo off
setlocal
set "PLATFORM_HOST=%~1"

if "%PLATFORM_HOST%"=="" set /p "PLATFORM_HOST=Platform host IPv4: "
if "%PLATFORM_HOST%"=="" (
    echo No host was entered.
    pause
    exit /b 1
)

set "PLATFORM_URL=http://%PLATFORM_HOST%:1002/"
set "PLATFORM_BROWSER="

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "PLATFORM_BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined PLATFORM_BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "PLATFORM_BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined PLATFORM_BROWSER if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "PLATFORM_BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not defined PLATFORM_BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "PLATFORM_BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined PLATFORM_BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "PLATFORM_BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined PLATFORM_BROWSER if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" set "PLATFORM_BROWSER=%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"

if defined PLATFORM_BROWSER (
    start "XAFS Sample Platform" "%PLATFORM_BROWSER%" --kiosk --no-first-run --new-window "%PLATFORM_URL%"
) else (
    echo Chrome or Edge was not found. Opening the URL with the default browser.
    start "" "%PLATFORM_URL%"
)
