# Legacy Test Reports & Audit Archive

This directory preserves historical audit documentation and legacy simulated test suites from early exploration and initial architecture phases:

- **Historical Architecture / Audit Notes**: `DATABASE_DATA_AUDIT.md`, `FINAL_END_TO_END_VALIDATION.md`, `FINAL_PRODUCTION_AUDIT.md`, `IMPLEMENTATION_PLAN.md`, `PROJECT_ARCHITECTURE_AUDIT.md`
- **Simulated Test Reports (Pre-Executable Framework)**: `AI_Study_Planner_*.xlsx`, `*.html`, `*.csv`, `*.xml`

---

## Current Active Real Test Suite

All current live reports in `testing/reports/` (`MASTER_TEST_REPORT.md`, `backend/`, `frontend/`, `e2e/`, `mobile/`, `summary/`) are generated **100% dynamically from real executable test runs**:
- **Backend**: Maven Surefire JUnit 5 XML (`backend/target/surefire-reports/`)
- **Frontend**: Jest JSON Output (`frontend/test-results.json`)
- **E2E**: Playwright JSON Output (`frontend/playwright-results.json`)
- **Mobile**: React Native Jest Output (`mobile/test-results.json`)

To re-run all real tests and regenerate reports:
```bash
# Windows
.\testing\run-all-tests.bat

# Linux / macOS
./testing/run-all-tests.sh
```
