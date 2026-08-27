@echo off
REM ============================================================
REM  start-local.cmd — Starts the backend with H2 local profile
REM  Usage: double-click this file OR run from terminal
REM  Frontend: http://localhost:3000 (run: cd frontend && npm run dev)
REM  Backend:  http://localhost:8080
REM  H2 Console: http://localhost:8080/h2-console (JDBC URL: jdbc:h2:file:./data/studyplanner)
REM  Data persists across restarts in ./data/studyplanner.mv.db (git-ignored).
REM ============================================================

echo.
echo  ====================================
echo   AI Study Planner - Local Backend
echo   Profile: local  ^|  Port: 8080
echo   Database: H2 file-based (persistent: ./data/studyplanner.mv.db)
echo  ====================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$portProc = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($portProc) { Write-Host 'Port 8080 is in use by PID '$portProc'. Stopping stale process...' -ForegroundColor Yellow; Stop-Process -Id $portProc -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 1 }; if (Test-Path '.env') { Get-Content '.env' | Where-Object { $_ -match '^[A-Za-z0-9_]+=' } | ForEach-Object { $p = $_.Split('=', 2); [System.Environment]::SetEnvironmentVariable($p[0].Trim(), $p[1].Trim(), 'Process') } }; [System.Environment]::SetEnvironmentVariable('SPRING_PROFILES_ACTIVE', 'local', 'Process'); & '.\mvnw.cmd' 'spring-boot:run'"

echo.
echo Backend stopped.
pause

