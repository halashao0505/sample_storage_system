@echo off
cd /d "%~dp0"

for %%P in (3200 1001 1002) do (
    netstat -ano | findstr /r /c:":%%P .*LISTENING" >nul
    if not errorlevel 1 (
        echo Port %%P is already in use. Close old Sample Platform windows first.
        exit /b 1
    )
)

where python >nul 2>nul
if errorlevel 1 (
    echo Python was not found. Install Python 3.10 or newer first.
    exit /b 1
)

cd /d "%~dp0web"
where npm >nul 2>nul
if errorlevel 1 (
    echo Node.js/npm was not found. Install Node.js LTS first.
    exit /b 1
)

if not exist "node_modules" (
    echo First run: installing web dependencies...
    call npm install
    if errorlevel 1 exit /b 1
)

echo Building dashboards...
call npm run build
if errorlevel 1 exit /b 1

start "Sample Platform API" cmd /k "cd /d ""%~dp0"" && python main.py"
start "XAFS Sample Platform" cmd /k "cd /d ""%~dp0web"" && npm run start:xafs"
start "XRD Sample Platform" cmd /k "cd /d ""%~dp0web"" && npm run start:xrd"
ping 127.0.0.1 -n 4 >nul
start "" "http://localhost:1001/"
start "" "http://localhost:1002/"

echo Platform started. Remote screens use this computer's IPv4 address.
