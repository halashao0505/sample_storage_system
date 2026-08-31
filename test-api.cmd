@echo off
cd /d "%~dp0"
python -m unittest discover -s backend\tests -v
python scripts\check_api.py
pause
