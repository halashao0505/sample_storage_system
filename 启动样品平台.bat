@echo off
cd /d "%~dp0web"

where npm >nul 2>nul
if errorlevel 1 (
    echo Node.js/npm was not found. Install Node.js LTS first.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo First run: installing web dependencies...
    call npm install
    if errorlevel 1 (
        echo Dependency installation failed. Check the network and try again.
        pause
        exit /b 1
    )
)

echo Building read-only dashboards...
call npm run build
if errorlevel 1 (
    echo Build failed. Check the messages above and try again.
    pause
    exit /b 1
)

start "XAFS Sample Platform" cmd /k "cd /d ""%~dp0web"" && npm run start:xafs"
start "XRD Sample Platform" cmd /k "cd /d ""%~dp0web"" && npm run start:xrd"
ping 127.0.0.1 -n 4 >nul
start "" "http://localhost:3101/"
start "" "http://localhost:3102/"
