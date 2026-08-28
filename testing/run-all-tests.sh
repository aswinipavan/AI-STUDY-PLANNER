#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==============================================================================="
echo "AI Study Planner - Unified Real Test Suite & Automated Report Generator"
echo "==============================================================================="
echo ""

echo "[1/4] Running Backend Tests (JUnit 5 / Spring Boot Test)..."
cd "${ROOT_DIR}/backend"
./mvnw test -Dspring.profiles.active=test || echo "[WARN] Some backend tests failed or were skipped."
echo ""

echo "[2/4] Running Frontend Unit & Component Tests (Jest)..."
cd "${ROOT_DIR}/frontend"
npm test -- --ci --json --outputFile=test-results.json || echo "[WARN] Some frontend tests failed."
echo ""

echo "[3/4] Running Frontend End-to-End Tests (Playwright)..."
cd "${ROOT_DIR}/frontend"
npx playwright test src/__tests__/e2e/ai_chat_scroll.spec.ts src/__tests__/e2e/material_subject_filter.spec.ts src/__tests__/e2e/profile_persistence.spec.ts src/__tests__/e2e/timetable_master_fix.spec.ts src/__tests__/e2e/materials.spec.ts src/__tests__/e2e/settings.spec.ts src/__tests__/e2e/timetable.spec.ts --reporter=json > playwright-results.json || echo "[WARN] Playwright reported warnings."
echo ""

echo "[4/4] Running Mobile Unit Tests (React Native Jest)..."
cd "${ROOT_DIR}/mobile"
npm test -- --json --outputFile=test-results.json || echo "[WARN] Mobile tests failed."
echo ""

echo "[5/5] Generating Verifiable Markdown Reports & Excel Test-Case Workbooks..."
cd "${ROOT_DIR}"
python3 testing/scripts/generate_test_reports.py
python3 testing/scripts/generate_excel_test_cases.py

echo ""
echo "==============================================================================="
echo "Test Run Complete!"
echo "Master Markdown report: testing/reports/MASTER_TEST_REPORT.md"
echo "Master Excel portfolio: testing/reports/MASTER_Test_Cases.xlsx"
echo "==============================================================================="
