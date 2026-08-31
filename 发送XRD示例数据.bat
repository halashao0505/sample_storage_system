@echo off
cd /d "%~dp0"
set "PYTHONPATH=%~dp0sdk\python"
python sdk\examples\send_xrd_snapshot.py
pause
