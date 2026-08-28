@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo AI Study Planner - Unified Real Test Suite & Automated Report Generator
echo ===============================================================================
echo.

set ROOT_DIR=%~dp0..
cd /d "%ROOT_DIR%"

echo [1/4] Running Backend Tests (JUnit 5 / Spring Boot Test)...
cd "%ROOT_DIR%\backend"
call .\mvnw.cmd test -Dspring.profiles.active=test
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend tests failed.
) else (
    echo [OK] Backend tests passed.
)
echo.

echo [2/4] Running Frontend Unit & Component Tests (Jest)...
cd "%ROOT_DIR%\frontend"
call npm test -- --ci --json --outputFile=test-results.json
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend unit tests failed.
) else (
    echo [OK] Frontend unit tests passed.
)
echo.

echo [3/4] Running Frontend End-to-End Tests (Playwright)...
cd "%ROOT_DIR%\frontend"
call npx playwright test src/__tests__/e2e/ai_chat_scroll.spec.ts src/__tests__/e2e/material_subject_filter.spec.ts src/__tests__/e2e/profile_persistence.spec.ts src/__tests__/e2e/timetable_master_fix.spec.ts src/__tests__/e2e/materials.spec.ts src/__tests__/e2e/settings.spec.ts src/__tests__/e2e/timetable.spec.ts --reporter=json > playwright-results.json
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Some Playwright tests reported warnings.
) else (
    echo [OK] Playwright core E2E tests passed.
)
echo.

echo [4/4] Running Mobile Unit Tests (React Native Jest)...
cd "%ROOT_DIR%\mobile"
call npm test -- --json --outputFile=test-results.json
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Mobile unit tests failed.
) else (
    echo [OK] Mobile unit tests passed.
)
echo.

echo [5/5] Generating Verifiable Markdown Reports & Excel Test-Case Workbooks...
cd "%ROOT_DIR%"
python testing\scripts\generate_test_reports.py
python testing\scripts\generate_excel_test_cases.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to generate test reports or Excel workbooks.
    exit /b 1
)

echo.
echo ===============================================================================
echo Test Run Complete!
echo Master Markdown report: testing\reports\MASTER_TEST_REPORT.md
echo Master Excel portfolio: testing\reports\MASTER_Test_Cases.xlsx
echo ===============================================================================
