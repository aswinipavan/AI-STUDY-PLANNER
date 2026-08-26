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
  "$envContent = Get-Content '.env' | Where-Object { $_ -match '^[^#\s]' -and $_ -match '=' }; foreach ($line in $envContent) { $parts = ($line -replace \"`r\",'') -split '=', 2; if ($parts.Count -eq 2) { [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process') } }; [System.Environment]::SetEnvironmentVariable('SPRING_PROFILES_ACTIVE', 'local', 'Process'); & '.\mvnw.cmd' 'spring-boot:run'"

echo.
echo Backend stopped.
pause

