# AI Study Planner — Real Executable Testing & 1,905-Case Test Portfolio

This repository contains a **100% genuine, traceable testing architecture** with dynamic automated execution reports and professional Excel test-case documentation workbooks (300+ cases per sheet) directly in `testing/reports/`.

---

## Testing Architecture

| Layer | Framework / Runner | Location | Report Source |
| :--- | :--- | :--- | :--- |
| **Backend** | JUnit 5 / Spring Boot Test / MockMvc | `backend/src/test/` | `backend/target/surefire-reports/TEST-*.xml` |
| **Frontend Unit** | Jest / React Testing Library | `frontend/src/__tests__/` | `frontend/test-results.json` |
| **Frontend E2E** | Playwright (Chromium) | `frontend/src/__tests__/e2e/` | `frontend/playwright-results.json` |
| **Mobile** | React Native Jest & Appium 3.x | `mobile/src/__tests__/` & `testing/appium/` | `mobile/test-results.json` |
| **Load & Performance** | Async HTTP Engine / Locust | `testing/load/` | `testing/load/` |
| **Consolidated Reports** | Python Real Report Generator | `testing/scripts/` | `testing/reports/MASTER_TEST_REPORT.md` |
| **Excel Portfolio** | OpenPyXL 300-Case Generator | `testing/scripts/` | `testing/reports/MASTER_Test_Cases.xlsx` |

---

## Generated Excel Test-Case Workbooks (1,905 Total Test Cases)

All 7 workbooks are generated directly inside `testing/reports/` with 20 required traceability columns:

1. [`Selenium_Test_Cases.xlsx`](file:///c:/Users/aswin/Downloads/AI-Study-Planner/testing/reports/Selenium_Test_Cases.xlsx) — **300** Browser E2E test cases mapped to Playwright specs across all web flows.
2. [`Appium_Test_Cases.xlsx`](file:///c:/Users/aswin/Downloads/AI-Study-Planner/testing/reports/Appium_Test_Cases.xlsx) — **300** Mobile test cases mapped to React Native Jest, Appium 3.x, and native device interactions.
3. [`Validation_Test_Cases.xlsx`](file:///c:/Users/aswin/Downloads/AI-Study-Planner/testing/reports/Validation_Test_Cases.xlsx) — **300** End-to-End product functional validation test cases covering all 20 product pillars.
4. [`Unit_Test_Cases.xlsx`](file:///c:/Users/aswin/Downloads/AI-Study-Planner/testing/reports/Unit_Test_Cases.xlsx) — **405** Unit & Component test cases (263 backend JUnit 5 + 134 frontend Jest + 8 mobile Jest).
5. [`Load_Test_Cases.xlsx`](file:///c:/Users/aswin/Downloads/AI-Study-Planner/testing/reports/Load_Test_Cases.xlsx) — **300** Performance, concurrency, spike, and soak test scenarios with strict SLA thresholds.
6. [`UI_UX_Test_Cases.xlsx`](file:///c:/Users/aswin/Downloads/AI-Study-Planner/testing/reports/UI_UX_Test_Cases.xlsx) — **300** UI/UX design system, sticky composer, KaTeX math, theme toggle, and accessibility test cases.
7. [`MASTER_Test_Cases.xlsx`](file:///c:/Users/aswin/Downloads/AI-Study-Planner/testing/reports/MASTER_Test_Cases.xlsx) — Master consolidated workbook with Executive Summary + 6 domain worksheets + Defects Tracking + Regression Protection Matrix (**1,905 total portfolio cases**).

---

## How to Re-Execute All Tests & Regenerate All Workbooks

```bash
# Windows
.\testing\run-all-tests.bat

# Linux / macOS
chmod +x ./testing/run-all-tests.sh
./testing/run-all-tests.sh
```
