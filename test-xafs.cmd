@echo off
cd /d "%~dp0web"
call npm run test:xafs
pause
