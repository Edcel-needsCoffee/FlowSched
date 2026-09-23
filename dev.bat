@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo   FlowSched - starting dev environment
echo ============================================
echo.

REM --- 0) Sanity: node/npm on PATH (double-click can run with a bare PATH) ---
where node >nul 2>&1
if errorlevel 1 (
    echo [FlowSched] ERROR: 'node' not found on PATH.
    echo [FlowSched] Open dev.bat from a terminal where `node -v` works,
    echo [FlowSched] or reinstall Node 20+ with "Add to PATH" checked.
    echo.
    pause
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo [FlowSched] ERROR: 'npm' not found on PATH.
    echo [FlowSched] Repair your Node install, then re-run dev.bat.
    echo.
    pause
    exit /b 1
)
node -v
call npm -v >nul 2>&1
if errorlevel 1 (
    echo [FlowSched] ERROR: npm failed to start. Try `npm -v` manually.
    echo.
    pause
    exit /b 1
)

REM --- 1) Sanity: workspace deps must be installed (run `npm install` once after cloning/pulling) ---
if not exist "%~dp0apps\web\node_modules\" (
    echo [FlowSched] ERROR: apps\web\node_modules missing.
    echo [FlowSched] Run this once from the repo root, then re-run dev.bat:
    echo [FlowSched]     npm install
    echo.
    pause
    exit /b 1
)
if not exist "%~dp0apps\api\node_modules\" (
    echo [FlowSched] ERROR: apps\api\node_modules missing.
    echo [FlowSched] Run this once from the repo root, then re-run dev.bat:
    echo [FlowSched]     npm install
    echo.
    pause
    exit /b 1
)
if not exist "%~dp0node_modules\framer-motion\" (
    echo [FlowSched] WARNING: framer-motion not found - web deps may be out of date.
    echo [FlowSched] Run this once from the repo root, then re-run dev.bat:
    echo [FlowSched]     npm install
    echo.
    pause
    exit /b 1
)

REM --- 2) Database: needs Docker Desktop running + the flowsched-postgres container ---
where docker >nul 2>&1
if errorlevel 1 (
    echo [FlowSched] ERROR: 'docker' not found on PATH. Start Docker Desktop first.
    echo.
    pause
    exit /b 1
)
docker info >nul 2>&1
if errorlevel 1 (
    echo [FlowSched] ERROR: Docker daemon not reachable. Open Docker Desktop and wait until it says "running".
    echo.
    pause
    exit /b 1
)
REM NOTE: `docker start` on an already-running container is a harmless no-op
REM (it just re-prints the name, exit code 0), so don't try to parse
REM `docker inspect` output here — the Go-template braces + pipe parsing
REM proved fragile across shells. Start unconditionally, then verify.
echo [FlowSched] Ensuring Postgres container is running...
docker start flowsched-postgres
if errorlevel 1 (
    echo [FlowSched] ERROR: could not start flowsched-postgres.
    echo [FlowSched] Create it once with:
    echo [FlowSched]     docker run -d --name flowsched-postgres -e POSTGRES_USER=flowsched -e POSTGRES_PASSWORD=flowsched -e POSTGRES_DB=flowsched -p 5433:5432 postgres:17
    echo.
    pause
    exit /b 1
)
echo [FlowSched] Postgres is running. Waiting 6s for connections...
timeout /t 6 /nobreak
echo [FlowSched] Postgres ready.

REM --- 3) API dev server in its own window (skip if port 4000 already listening) ---
REM Two-stage check: only LISTENING lines, then a literal ":4000 " match.
REM findstr /c: stops the pattern being space-split into ":4000" OR anything,
REM and the trailing space avoids false matches like :14000 or :40000.
netstat -ano | findstr "LISTENING" | findstr /c:":4000 " >nul
if errorlevel 1 (
    echo [FlowSched] Starting API on http://localhost:4000 ...
    start "FlowSched API" cmd /k "cd /d ""%~dp0"" && npm run dev --workspace apps/api"
) else (
    echo [FlowSched] Port 4000 already in use - API looks already running. Skipping.
)

REM --- 4) Web dev server in its own window (skip if port 5173 already listening) ---
netstat -ano | findstr "LISTENING" | findstr /c:":5173 " >nul
if errorlevel 1 (
    echo [FlowSched] Starting web on http://localhost:5173 ...
    start "FlowSched Web" cmd /k "cd /d ""%~dp0"" && npm run dev --workspace apps/web"
) else (
    echo [FlowSched] Port 5173 already in use - web looks already running. Skipping.
)

echo.
echo [FlowSched] Web app:            http://localhost:5173
echo [FlowSched] API health check:   http://localhost:4000/api/health
echo [FlowSched] Chair login:        chair.dev@flowsched.local / dev-password-change-me
echo [FlowSched] Admin login:        admin.dev@flowsched.local / dev-password-change-me
echo.
echo [FlowSched] Close the two server windows (or run dev-stop.bat) to stop.
echo.
pause
endlocal
