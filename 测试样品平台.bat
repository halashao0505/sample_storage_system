@echo off
cd /d "%~dp0web"
call npm run test:xafs
call npm run test:xrd
pause
