@echo off
chcp 65001 >nul
cd /d "%~dp0web"

where npm >nul 2>nul
if errorlevel 1 (
    echo 未找到 Node.js/npm，请先安装 Node.js LTS。
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo 首次运行，正在安装网页依赖...
    call npm install
    if errorlevel 1 (
        echo 网页依赖安装失败，请检查网络后重试。
        pause
        exit /b 1
    )
)

start "Sample Platform Server" cmd /k "cd /d ""%~dp0web"" && npm run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000/"

