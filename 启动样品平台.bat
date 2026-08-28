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

start "Sample Platform Server" cmd /k "cd /d ""%~dp0web"" && npm run dev"
ping 127.0.0.1 -n 5 >nul
start "" "http://localhost:3000/"
