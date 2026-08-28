@echo off
setlocal enabledelayedexpansion
title AI Study Planner - Launcher

echo ===================================================
echo   AI Study Planner - Full Stack Launcher
echo ===================================================
echo.

set "PROJECT_ROOT=%~dp0"

echo [1/4] Checking and freeing ports (8080, 3000)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(8080, 3000); foreach ($port in $ports) { $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($pids) { foreach ($p in $pids) { $proc = Get-Process -Id $p -ErrorAction SilentlyContinue; $name = if ($proc) { $proc.ProcessName } else { 'Unknown' }; Write-Host ('  [PORT ' + $port + '] Found active process: PID ' + $p + ' (' + $name + '). Terminating...') -ForegroundColor Yellow; & taskkill /F /T /PID $p 2>$null | Out-Null; Start-Sleep -Milliseconds 300; if (Get-Process -Id $p -ErrorAction SilentlyContinue) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } } } else { Write-Host ('  [PORT ' + $port + '] Port is free.') -ForegroundColor Green } }; $backendLock = Join-Path $env:PROJECT_ROOT 'backend\data\studyplanner.lock.db'; if (Test-Path $backendLock) { Remove-Item -Force $backendLock -ErrorAction SilentlyContinue }; $sw = [System.Diagnostics.Stopwatch]::StartNew(); while ($sw.Elapsed.TotalSeconds -lt 10) { $p8080 = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue; $p3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if (-not $p8080 -and -not $p3000) { break }; Start-Sleep -Milliseconds 500 }; $f8080 = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue; $f3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($f8080 -or $f3000) { Write-Host '  [ERROR] Failed to free ports before starting.' -ForegroundColor Red; exit 1 } else { Write-Host '  [OK] Both ports 8080 and 3000 are verified free.' -ForegroundColor Green }"

if %ERRORLEVEL% neq 0 (
  echo.
  echo [ERROR] Port clearance failed. Aborting startup.
  exit /b 1
)

echo.
echo [2/4] Launching Spring Boot backend in a dedicated terminal...
start "AI Study Planner - Backend" /D "%PROJECT_ROOT%backend" cmd /k "start-local.cmd"

echo.
echo [3/4] Waiting for backend readiness at http://localhost:8080/actuator/health...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$healthUrl = 'http://localhost:8080/actuator/health'; $maxWaitSec = 90; $sw = [System.Diagnostics.Stopwatch]::StartNew(); $ready = $false; Write-Host '  Polling backend health endpoint' -NoNewline -ForegroundColor Cyan; while ($sw.Elapsed.TotalSeconds -lt $maxWaitSec) { try { $resp = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 2 -ErrorAction Stop; if ($resp.status -eq 'UP') { $ready = $true; break } } catch { }; Start-Sleep -Seconds 1; Write-Host -NoNewline '.' -ForegroundColor DarkGray }; Write-Host ''; if ($ready) { $secs = [math]::Round($sw.Elapsed.TotalSeconds, 1); Write-Host ('  [OK] Backend is UP and ready! (took ' + $secs + 's)') -ForegroundColor Green; exit 0 } else { Write-Host ('  [ERROR] Backend failed to respond with UP status within ' + $maxWaitSec + 's.') -ForegroundColor Red; Write-Host '  Please check the Backend terminal window for error details.' -ForegroundColor Yellow; exit 1 }"

if %ERRORLEVEL% neq 0 (
  echo.
  echo [ERROR] Backend health check failed. Frontend will NOT be started.
  exit /b 1
)

echo.
echo [4/4] Launching Next.js frontend in a dedicated terminal...
start "AI Study Planner - Frontend" /D "%PROJECT_ROOT%frontend" cmd /k "npm run dev"

echo.
echo Waiting for frontend to bind port 3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$maxWaitSec = 30; $sw = [System.Diagnostics.Stopwatch]::StartNew(); $ready = $false; Write-Host '  Waiting for frontend on http://localhost:3000' -NoNewline -ForegroundColor Cyan; while ($sw.Elapsed.TotalSeconds -lt $maxWaitSec) { $tcp = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($tcp) { try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { $ready = $true; break } } catch { $ready = $true; break } }; Start-Sleep -Milliseconds 500; Write-Host -NoNewline '.' -ForegroundColor DarkGray }; Write-Host ''; if ($ready) { $secs = [math]::Round($sw.Elapsed.TotalSeconds, 1); Write-Host ('  [OK] Frontend is ready on http://localhost:3000 (took ' + $secs + 's)') -ForegroundColor Green; Start-Process 'http://localhost:3000' } else { Write-Host '  [WARN] Frontend startup took longer than expected. Opening browser anyway...' -ForegroundColor Yellow; Start-Process 'http://localhost:3000' }"

echo.
echo ===================================================
echo   AI Study Planner is UP and Running!
echo ===================================================
echo   Backend : http://localhost:8080
echo   Frontend: http://localhost:3000
echo ===================================================
echo.
echo Both terminal windows (Backend and Frontend) are running.
echo To cleanly stop both servers, run: .\stop-project.bat
echo ===================================================
