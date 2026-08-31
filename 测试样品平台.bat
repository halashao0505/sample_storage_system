@echo off
cd /d "%~dp0"
python -m unittest discover -s backend\tests -v
python scripts\check_api.py
if errorlevel 1 (
    echo API check failed. Start the platform first.
    pause
    exit /b 1
)
cd /d "%~dp0web"
call npm run test:xafs
call npm run test:xrd
pause
