@echo off
setlocal enabledelayedexpansion
title AI Study Planner - Stopper

echo ===================================================
echo   AI Study Planner - Stopping Services
echo ===================================================
echo.

set "PROJECT_ROOT=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(8080, 3000); foreach ($port in $ports) { $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($pids) { foreach ($p in $pids) { $proc = Get-Process -Id $p -ErrorAction SilentlyContinue; $name = if ($proc) { $proc.ProcessName } else { 'Unknown' }; Write-Host ('  [STOP] Port ' + $port + ' is in use by PID ' + $p + ' (' + $name + '). Terminating...') -ForegroundColor Yellow; & taskkill /F /T /PID $p 2>$null | Out-Null; Start-Sleep -Milliseconds 300; if (Get-Process -Id $p -ErrorAction SilentlyContinue) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } } } else { Write-Host ('  [OK]   Port ' + $port + ' is already free.') -ForegroundColor Green } }; $backendLock = Join-Path $env:PROJECT_ROOT 'backend\data\studyplanner.lock.db'; if (Test-Path $backendLock) { Remove-Item -Force $backendLock -ErrorAction SilentlyContinue }; $sw = [System.Diagnostics.Stopwatch]::StartNew(); while ($sw.Elapsed.TotalSeconds -lt 10) { $p8080 = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue; $p3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if (-not $p8080 -and -not $p3000) { break }; Start-Sleep -Milliseconds 500 }; $final8080 = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue; $final3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; Write-Host ''; if (-not $final8080 -and -not $final3000) { Write-Host '===================================================' -ForegroundColor Green; Write-Host '  All AI Study Planner ports (8080, 3000) are free!' -ForegroundColor Green; Write-Host '===================================================' -ForegroundColor Green } else { if ($final8080) { Write-Host '  [WARN] Port 8080 is still occupied.' -ForegroundColor Red }; if ($final3000) { Write-Host '  [WARN] Port 3000 is still occupied.' -ForegroundColor Red } }"

echo.
