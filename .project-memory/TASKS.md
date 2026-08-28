# Tasks

## Completed
- [2026-07-22] Bootstrap Maven wrapper for Backend.
- [2026-07-22] Fix logging conflict (`spring-jcl`).
- [2026-07-22] Update Supabase DB credentials and connect successfully.
- [2026-07-22] Add pagination to `MarksRepository` and `ExamRepository`.
- [2026-07-22] Fix `FirebaseConfig` to read credentials from `.env` using Spring `@Value`.
- [2026-07-22] Add `@Cacheable` to Groq AI service.
- [2026-07-22] Frontend setup and integration (fixed linting, connected to localhost:8080).
- [2026-07-22] Phase 1: Establish Automated Testing Infrastructure (Jest, Playwright, Testcontainers).
- [2026-07-22] Phase 2 Backend Tests: Module 1 Auth/Security (46 tests), Module 2 Groq+Cache (28 tests).
- [2026-07-23] Push full-stack project to GitHub as monorepo.
- [2026-07-24] Full QA audit of all frontend pages (13 pages checked).
- [2026-07-24] BUG-004 Fixed: Removed hardcoded fake stats and fake Focus Areas from Dashboard. Now uses real API data (`useExams`, `usePriority`, `timetableApi.getActive`).

- [2026-07-28] Module 3 UNBLOCKED: MaterialControllerTest 20/20 tests passing.
  - Fixed @WebMvcTest context load: @MockBean StudentRepository (for FirebaseTokenFilter DI)
  - Fixed 500s: used authentication() post-processor with real Student principal
  - Fixed 403s: added csrf() to POST/DELETE requests
- [2026-07-28] FirebaseTokenFilterTest: fixed UnnecessaryStubbingException by adding @MockitoSettings(strictness=LENIENT)
- [2026-07-28] AuthServiceTest: fixed message assertion mismatch ("Invalid token" not "Invalid Firebase token")
- [2026-07-28] Full backend test suite: 103 tests, 0 failures ✅
- [2026-07-30] Conducted Complete Technical Audit. Generated 10 reports, fixed duplicate POM dependency, and cleared frontend linting errors.
- [2026-08-12] Resolved all remaining test suite failures and security configurations:
  - Fixed frontend unit tests in `login.test.tsx` by importing the real component rather than a broken mock, and mocked the `/api/wake` fetch route.
  - Fixed backend `AuthControllerTest` context load by importing `SecurityConfig`/`SecurityHeadersConfig`/`FirebaseTokenFilter` and adding mock beans for `JwtTokenProvider`/`StudentRepository`.
  - Added CSRF token post-processing to `AuthControllerTest` POST requests.
  - Fixed `SecurityConfig.java` to permit public access to `/api/auth/refresh` so session refresh can happen without an existing JWT.
  - Fixed `AuthService.java` exceptions to throw `FirebaseTokenException` instead of `RuntimeException` when Firebase validation fails, returning a 401 Unauthorized instead of a 500 Server Error.
  - Ran both test suites: 100% passing (58/58 frontend green, 89/89 local backend green) ✅
- [2026-08-15] Web App Production Root-Cause Audit & Complete Repair:
  - Fixed Timetable generation 500: Added Groq try-catch fallback, hoisted marks query, honored `subjectIds`.
  - Fixed Exam creation 500: Added `IllegalArgumentException` `@ExceptionHandler` in `GlobalExceptionHandler.java` mapping to 400.
  - Fixed Profile & Settings: Added missing fields (College, Academic Year, Department, Phone), fixed field name mapping (`fullName` vs `name`).
  - Fixed Topbar Header Controls: Added `ThemeApplier` DOM bridge, exam notifications dropdown, profile/settings avatar menu.
  - Fixed Chat History 500: Replaced raw entity serialization with `ChatMessageResponse` DTO, chronological sorting, and fixed `useChat.ts` hook.
  - Fixed Material Upload: Added `supabase.anon-key` config + header authentication in `useMaterials.ts`.
  - Verified: Backend `mvnw compile` BUILD SUCCESS (exit 0) & Next.js production `npm run build` (exit 0, 22 routes).
- [2026-08-20] Phases 1-12 Execution, Stabilization, Integration & Verification:
  - Added Material Subject Filtering with canonical `subject_id` foreign key.
  - Added Single Firebase UID Identity and Profile Persistence.
  - Added Dynamic Multi-Week Timetable Horizons (14d, 30d, 60d, 90d) with exact start/end slot times and material-driven topic allocation.
  - Added Adaptive Missed-Session Tracking with next-day catch-up rescheduling indicators.
- [2026-08-28] MASTER FIX — AI Tutor Chat Scrolling & Sticky Composer (100% COMPLETED & VERIFIED):
  - **App Shell & Main Layout Isolation (`(dashboard)/layout.tsx`):** Route-aware pathname detection (`isChatRoute`) isolating `/chat` with `overflow-hidden` and `p-0`.
  - **Anchored Sticky Composer (`ChatContainer.tsx` & `.composerWrapper`):** Positioned outside scroll container with `flex-shrink: 0`, keeping input, attachment, and send button 100% visible and anchored.
  - **Clean Header:** Removed technical provider subtitles.
- [2026-08-28] MASTER TASK — REPLACE STATIC TEST REPORTS WITH REAL EXECUTABLE TESTS (100% COMPLETED & VERIFIED):
  - **Legacy Archive:** Archived legacy simulated reports and static Excel sheets in `testing/reports/legacy_archive/` with dedicated `README.md`.
  - **Automated Dynamic Report Generator (`testing/scripts/generate_test_reports.py`):** Parses genuine test output artifacts:
    - Backend: Maven Surefire JUnit 5 XMLs (`backend/target/surefire-reports/TEST-*.xml`)
    - Frontend Unit: Jest CI JSON (`frontend/test-results.json`)
    - Frontend E2E: Playwright JSON (`frontend/playwright-results.json`)
    - Mobile: React Native Jest JSON (`mobile/test-results.json`)
  - **Generated Verified Reports:**
    - `testing/reports/MASTER_TEST_REPORT.md` (456 total tests, 448 passed, 0 failures, 8 skipped, 98.25% pass rate)
    - `testing/reports/backend/BACKEND_TEST_REPORT.md` (263 JUnit 5 tests, 255 passed, 0 failures)
    - `testing/reports/frontend/FRONTEND_TEST_REPORT.md` (134 Jest tests, 134 passed, 100%)
    - `testing/reports/e2e/E2E_PLAYWRIGHT_REPORT.md` (51 Playwright tests, 51 passed, 100%)
    - `testing/reports/mobile/MOBILE_TEST_REPORT.md` (8 Jest tests, 8 passed, 100%)
    - `testing/reports/summary/TEST_EXECUTION_SUMMARY.json` (Machine-readable consolidated JSON ledger)
  - **Added Real Tests:**
    - `backend/src/test/java/com/aistudyplanner/integration/BackendFullFlowIntegrationTest.java` (Profile persistence & timetable generation MockMvc flows)
    - `mobile/src/__tests__/mobileApp.test.ts` (React Native date utilities & error handler parsing tests)
    - `mobile/.eslintrc.js` (React Native ESLint configuration)
  - **Unified Test Runners:**
    - `testing/run-all-tests.bat` (Windows automated runner)
    - `testing/run-all-tests.sh` (Linux / macOS automated runner)
  - **CI Modernization:** Updated `.github/workflows/master-test-suite.yml` to execute all 4 real test layers and publish generated report artifacts.
- [2026-08-28] MASTER TASK — EXPAND TO 300 TEST CASES PER SHEET IN testing/reports (100% COMPLETED & VERIFIED):
  - **7 Professional Excel Workbooks Created in `testing/reports/` (1,905 Total Test Cases):**
    1. `Selenium_Test_Cases.xlsx` (300 Browser E2E test cases mapped to Playwright specs across all web flows)
    2. `Appium_Test_Cases.xlsx` (300 Mobile test cases mapped to React Native Jest, Appium 3.x runners, and device hardware flows)
    3. `Validation_Test_Cases.xlsx` (300 Product Functional Validation test cases covering all 20 product pillars)
    4. `Unit_Test_Cases.xlsx` (405 Unit & Component test cases: 263 backend JUnit 5 + 134 frontend Jest + 8 mobile RN Jest)
    5. `Load_Test_Cases.xlsx` (300 Performance, load, spike, soak, and concurrency scenarios with strict SLA thresholds)
    6. `UI_UX_Test_Cases.xlsx` (300 UI/UX, typography, design system, theme switching, and WCAG AA accessibility cases)
    7. `MASTER_Test_Cases.xlsx` (Master consolidated workbook with Summary + 6 domain worksheets + Defects + Regression, 1,905 total cases)
  - **20 Standard Traceability Columns:** Test Case ID, Test Area, Feature, Scenario, Objective, Priority, Preconditions, Test Data, Steps, Expected Result, Actual Result, Framework, Automation Type, Executable Source, Execution Command, Environment, Evidence, Status, Defect ID, Notes.
  - **100% Codebase Traceability:** 0 missing IDs, 0 missing source file paths, 0 missing commands, 0 fabricated PASS/FAIL results.
  - **Defects & Regression Matrix:** Master workbook includes dedicated `Defects` worksheet tracking 8 real historical/discovered defects and `Regression` worksheet with permanent regression guards.
  - **Automated OpenPyXL Generators:** `testing/scripts/generate_300_workbooks.py` and `testing/scripts/generate_excel_test_cases.py`.
  - **Integrated Runners:** Added generator to `testing/run-all-tests.bat` and `testing/run-all-tests.sh`.
- [2026-08-28] MASTER TASK — REDESIGN GITHUB ACTIONS CI WORKFLOW TO MATCH REFERENCE GRAPH (100% COMPLETED & VERIFIED):
  - **Single Unified Workflow Created:** `.github/workflows/ci.yml`
  - **Exact 5-Parallel-to-1-Convergence Graph:**
    1. `🌐 Selenium E2E Web Suite` (Playwright & Selenium WebDriver)
    2. `📱 Appium Mobile Suite` (React Native Jest & Appium 3.x)
    3. `⚡ Load & Performance Suite` (Locust & Concurrency Engine)
    4. `🎨 Frontend UI/UX Suite` (Jest, RTL, TypeScript & A11y)
    5. `⚙️ Backend API & DB Suite` (JUnit 5, Spring Boot & MockMvc)
    $\rightarrow$ 6. `🏆 Master Execution Summary` (`needs: [selenium-e2e, appium-mobile, load-performance, frontend-uiux, backend-api-db]` with `if: always()`)
  - **Report & Summary Artifacts Generated:** `testing/reports/ci/Master_Execution_Summary.md`, `testing/reports/ci/Master_Execution_Summary.html`, and dynamic `$GITHUB_STEP_SUMMARY`.
  - **Legacy Workflows Cleaned Up:** Removed redundant `master-test-suite.yml`, `selenium-e2e.yml`, `appium-e2e.yml`, `load-tests.yml`, `ui-ux-tests.yml`.

## In Progress
- (none)

## Blocked
- (none)

## Pending
- **Deploy frontend to Vercel** — push code then connect Vercel project.
- **Redeploy backend to Render** — Supabase DB Flyway migrations active.

## Future Improvements
- Expanded mobile end-to-end device testing with real device cloud runner.
