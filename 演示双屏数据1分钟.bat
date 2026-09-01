@echo off
setlocal
cd /d "%~dp0"

echo Sends demo data to XRD (1001) and XAFS (1002) for 60 seconds.
echo Start the platform first. Enter the same write token below.
set "SAMPLE_PLATFORM_DEMO_TOKEN="
set /p "SAMPLE_PLATFORM_DEMO_TOKEN=Write token: "

python "%~dp0scripts\demo_both_for_one_minute.py"
if errorlevel 1 echo Demo did not finish. Check the platform service and token.
pause
