# AI Study Planner - Mobile Android Launcher (PowerShell)
[CmdletBinding()]
param()

$Host.UI.RawUI.WindowTitle = "AI Study Planner - Mobile Launcher"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  AI Study Planner - Mobile Android Launcher" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Resolve Directories
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path (Join-Path $ScriptDir "android\gradlew.bat")) {
    $MobileDir = $ScriptDir
    $AndroidDir = Join-Path $ScriptDir "android"
} elseif (Test-Path (Join-Path $ScriptDir "mobile\android\gradlew.bat")) {
    $MobileDir = Join-Path $ScriptDir "mobile"
    $AndroidDir = Join-Path $ScriptDir "mobile\android"
} else {
    $MobileDir = "C:\Users\aswin\Downloads\AI-Study-Planner\mobile"
    $AndroidDir = "C:\Users\aswin\Downloads\AI-Study-Planner\mobile\android"
}

# [1/6] Checking ADB...
Write-Host "[1/6] Checking ADB..." -ForegroundColor Yellow
$Adb = $null
$defaultAdb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$aswinAdb = "C:\Users\aswin\AppData\Local\Android\Sdk\platform-tools\adb.exe"

if (Test-Path $defaultAdb) {
    $Adb = $defaultAdb
} elseif (Test-Path $aswinAdb) {
    $Adb = $aswinAdb
} elseif ($env:ANDROID_HOME -and (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) {
    $Adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
} elseif ($env:ANDROID_SDK_ROOT -and (Test-Path "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe")) {
    $Adb = "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe"
} else {
    $cmd = Get-Command adb -ErrorAction SilentlyContinue
    if ($cmd) { $Adb = $cmd.Source }
}

if (-not $Adb) {
    Write-Host "`n[ERROR] ADB not found. Please install the Android SDK or add adb.exe to your PATH." -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] ADB found: $Adb" -ForegroundColor Green

# [2/6] Checking Android device...
Write-Host "`n[2/6] Checking Android device..." -ForegroundColor Yellow
$rawDevices = & $Adb devices 2>$null
$unauthorized = $false
$connectedDevices = @()

foreach ($line in $rawDevices) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("List of") -or $trimmed.StartsWith("*")) { continue }
    $parts = -split $trimmed
    if ($parts.Length -ge 2) {
        if ($parts[1] -eq 'unauthorized') {
            $unauthorized = $true
        } elseif ($parts[1] -eq 'device') {
            $connectedDevices += $parts[0]
        }
    }
}

if ($unauthorized) {
    Write-Host "Authorize USB debugging on the phone and run the script again." -ForegroundColor Red
    exit 2
}

if ($connectedDevices.Count -eq 0) {
    Write-Host "No Android device detected. Connect the phone and enable USB debugging." -ForegroundColor Red
    exit 1
}

Write-Host ("  [OK] Connected Android device: " + ($connectedDevices -join ", ")) -ForegroundColor Green

# [3/6] Checking Metro...
Write-Host "`n[3/6] Checking Metro..." -ForegroundColor Yellow
$metroUrl = "http://localhost:8081/status"
$isMetroRunning = $false
try {
    $res = Invoke-RestMethod -Uri $metroUrl -Method Get -TimeoutSec 2 -ErrorAction Stop
    if ($res -match "packager-status:running") {
        $isMetroRunning = $true
    }
} catch {}

if ($isMetroRunning) {
    Write-Host "  [OK] Metro bundler is already running on port 8081." -ForegroundColor Green
} else {
    Write-Host "  Starting Metro bundler in a separate window..." -ForegroundColor Cyan
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$MobileDir`" && npx react-native start" -WorkingDirectory $MobileDir
    Write-Host "  Waiting for Metro to be ready on port 8081..." -ForegroundColor Cyan
    
    $maxWait = 30
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $ready = $false
    while ($sw.Elapsed.TotalSeconds -lt $maxWait) {
        try {
            $r = Invoke-RestMethod -Uri $metroUrl -Method Get -TimeoutSec 2 -ErrorAction Stop
            if ($r -match "packager-status:running") {
                $ready = $true
                break
            }
        } catch {}
        Start-Sleep -Milliseconds 500
    }
    
    if ($ready) {
        $sec = [math]::Round($sw.Elapsed.TotalSeconds, 1)
        Write-Host "  [OK] Metro bundler is ready (took ${sec}s)." -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Metro did not respond within 30s, continuing..." -ForegroundColor Yellow
    }
}

# [4/6] Configuring ADB reverse...
Write-Host "`n[4/6] Configuring ADB reverse..." -ForegroundColor Yellow
& $Adb reverse tcp:8081 tcp:8081
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Failed to set up adb reverse tcp:8081 tcp:8081." -ForegroundColor Red
    exit 1
}

$revList = & $Adb reverse --list 2>$null
if ($revList -match "tcp:8081\s+tcp:8081") {
    Write-Host "  [OK] Reverse mapping verified (tcp:8081 -> tcp:8081)." -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Reverse mapping verification failed." -ForegroundColor Red
    exit 1
}

# [5/6] Installing debug APK...
Write-Host "`n[5/6] Installing debug APK..." -ForegroundColor Yellow
Push-Location $AndroidDir
try {
    & .\gradlew.bat app:installDebug
    $gradleExit = $LASTEXITCODE
} finally {
    Pop-Location
}

if ($gradleExit -ne 0) {
    Write-Host "`n[ERROR] Gradle installDebug failed with exit code $gradleExit." -ForegroundColor Red
    exit $gradleExit
}

Write-Host "  [OK] Debug APK installed successfully." -ForegroundColor Green

# [6/6] Launching StudyPlanner...
Write-Host "`n[6/6] Launching StudyPlanner..." -ForegroundColor Yellow
& $Adb shell am start -n com.study.planner/.MainActivity
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Failed to launch com.study.planner/.MainActivity." -ForegroundColor Red
    exit 1
}

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "StudyPlanner is running on the connected Android device." -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
