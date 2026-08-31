@echo off
setlocal enabledelayedexpansion
title AI Study Planner - Mobile Launcher

echo ===================================================
echo   AI Study Planner - Mobile Android Launcher
echo ===================================================
echo.

:: ── Resolve Directories ──────────────────────────────────────────────────────
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%android\gradlew.bat" (
    set "MOBILE_DIR=%SCRIPT_DIR%"
    set "ANDROID_DIR=%SCRIPT_DIR%android"
) else if exist "%SCRIPT_DIR%mobile\android\gradlew.bat" (
    set "MOBILE_DIR=%SCRIPT_DIR%mobile"
    set "ANDROID_DIR=%SCRIPT_DIR%mobile\android"
) else (
    set "MOBILE_DIR=C:\Users\aswin\Downloads\AI-Study-Planner\mobile"
    set "ANDROID_DIR=C:\Users\aswin\Downloads\AI-Study-Planner\mobile\android"
)

:: ── [1/6] Checking ADB... ────────────────────────────────────────────────────
echo [1/6] Checking ADB...
set "ADB="
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
) else if exist "C:\Users\aswin\AppData\Local\Android\Sdk\platform-tools\adb.exe" (
    set "ADB=C:\Users\aswin\AppData\Local\Android\Sdk\platform-tools\adb.exe"
) else if defined ANDROID_HOME (
    if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
        set "ADB=%ANDROID_HOME%\platform-tools\adb.exe"
    )
) else if defined ANDROID_SDK_ROOT (
    if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" (
        set "ADB=%ANDROID_SDK_ROOT%\platform-tools\adb.exe"
    )
)

if "%ADB%"=="" (
    where adb >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        set "ADB=adb"
    )
)

if "%ADB%"=="" (
    echo.
    echo [ERROR] ADB not found. Please install the Android SDK or add adb.exe to your PATH.
    exit /b 1
)

:: Verify ADB executable runs
"%ADB%" version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to execute ADB at "%ADB%".
    exit /b 1
)
echo   [OK] ADB found: %ADB%

:: ── [2/6] Checking Android device... ─────────────────────────────────────────
echo.
echo [2/6] Checking Android device...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$adb = '%ADB%';" ^
  "$lines = & $adb devices 2>$null;" ^
  "$unauth = $false; $devices = @();" ^
  "foreach ($l in $lines) { $t = $l.Trim(); if (-not $t -or $t.StartsWith('List of') -or $t.StartsWith('*')) { continue }; $p = -split $t; if ($p.Length -ge 2) { if ($p[1] -eq 'unauthorized') { $unauth = $true } elseif ($p[1] -eq 'device') { $devices += $p[0] } } };" ^
  "if ($unauth) { Write-Host 'Authorize USB debugging on the phone and run the script again.' -ForegroundColor Red; exit 2 };" ^
  "if ($devices.Count -eq 0) { Write-Host 'No Android device detected. Connect the phone and enable USB debugging.' -ForegroundColor Red; exit 1 };" ^
  "Write-Host ('  [OK] Connected Android device: ' + ($devices -join ', ')) -ForegroundColor Green;"

set "DEV_STATUS=%ERRORLEVEL%"
if %DEV_STATUS% equ 1 (
    exit /b 1
)
if %DEV_STATUS% equ 2 (
    exit /b 2
)

:: ── [3/6] Checking Metro... ──────────────────────────────────────────────────
echo.
echo [3/6] Checking Metro...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$metroUrl = 'http://localhost:8081/status';" ^
  "try {" ^
  "  $res = Invoke-RestMethod -Uri $metroUrl -Method Get -TimeoutSec 2 -ErrorAction Stop;" ^
  "  if ($res -match 'packager-status:running') { Write-Host '  [OK] Metro bundler is already running on port 8081.' -ForegroundColor Green; exit 0 }" ^
  "} catch {};" ^
  "exit 10"

if %ERRORLEVEL% equ 10 (
    echo   Starting Metro bundler in a separate window...
    start "AI Study Planner - Metro Bundler" /D "%MOBILE_DIR%" cmd /k "npx react-native start"
    echo   Waiting for Metro to be ready on port 8081...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$metroUrl = 'http://localhost:8081/status'; $maxWait = 30; $sw = [System.Diagnostics.Stopwatch]::StartNew(); $ready = $false;" ^
      "while ($sw.Elapsed.TotalSeconds -lt $maxWait) {" ^
      "  try {" ^
      "    $r = Invoke-RestMethod -Uri $metroUrl -Method Get -TimeoutSec 2 -ErrorAction Stop;" ^
      "    if ($r -match 'packager-status:running') { $ready = $true; break }" ^
      "  } catch {};" ^
      "  Start-Sleep -Milliseconds 500;" ^
      "};" ^
      "if ($ready) {" ^
      "  $sec = [math]::Round($sw.Elapsed.TotalSeconds, 1);" ^
      "  Write-Host ('  [OK] Metro bundler is ready (took ' + $sec + 's).') -ForegroundColor Green; exit 0;" ^
      "} else {" ^
      "  Write-Host '  [WARN] Metro did not respond within 30s, continuing...' -ForegroundColor Yellow; exit 0;" ^
      "}"
)

:: ── [4/6] Configuring ADB reverse... ─────────────────────────────────────────
echo.
echo [4/6] Configuring ADB reverse...
"%ADB%" reverse tcp:8081 tcp:8081
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to set up adb reverse tcp:8081 tcp:8081.
    exit /b 1
)

:: Verify reverse mapping exists
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$adb = '%ADB%';" ^
  "$list = & $adb reverse --list 2>$null;" ^
  "if ($list -match 'tcp:8081\s+tcp:8081') {" ^
  "  Write-Host '  [OK] Reverse mapping verified (tcp:8081 -> tcp:8081).' -ForegroundColor Green; exit 0;" ^
  "} else {" ^
  "  Write-Host '  [ERROR] Reverse mapping verification failed.' -ForegroundColor Red; exit 1;" ^
  "}"

if %ERRORLEVEL% neq 0 (
    exit /b 1
)

:: ── [5/6] Installing debug APK... ───────────────────────────────────────────
echo.
echo [5/6] Installing debug APK...
pushd "%ANDROID_DIR%"
call gradlew.bat app:installDebug
set "GRADLE_STATUS=%ERRORLEVEL%"
popd

if %GRADLE_STATUS% neq 0 (
    echo.
    echo [ERROR] Gradle installDebug failed with exit code %GRADLE_STATUS%.
    exit /b %GRADLE_STATUS%
)
echo   [OK] Debug APK installed successfully.

:: ── [6/6] Launching StudyPlanner... ──────────────────────────────────────────
echo.
echo [6/6] Launching StudyPlanner...
"%ADB%" shell am start -n com.study.planner/.MainActivity
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to launch com.study.planner/.MainActivity.
    exit /b 1
)

echo.
echo ===================================================
echo StudyPlanner is running on the connected Android device.
echo ===================================================
