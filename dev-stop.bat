@echo off
setlocal enabledelayedexpansion

echo.
echo [FlowSched] Stopping dev servers...

REM Kill by window title first (the windows dev.bat opened).
taskkill /fi "WINDOWTITLE eq FlowSched API*" /t /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq FlowSched Web*" /t /f >nul 2>&1

REM Port-based fallback: kill whatever is still LISTENING on 3000 / 5173.
set FOUND=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr /c:":4000 "') do (
    taskkill /pid %%p /t /f >nul 2>&1
    set FOUND=1
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr /c:":5173 "') do (
    taskkill /pid %%p /t /f >nul 2>&1
    set FOUND=1
)

if !FOUND!==1 (
    echo [FlowSched] Killed remaining listeners by port.
)
echo [FlowSched] Done. Postgres container left running (start it with: docker start flowsched-postgres).
echo.
endlocal
