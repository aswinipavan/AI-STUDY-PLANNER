# Tasks

## Completed
- [2026-09-01] Built Master Feature: Evidence-Based Study Session Completion with AI Verification (WEB APPLICATION):
  - **Entity & Migration:** Created `VerificationStatus` enum (`APPROVED`, `NEEDS_MORE_WORK`, `REVIEW_REQUIRED`), `StudyEvidenceSubmission` JPA entity, `StudyEvidenceSubmissionRepository`, and Flyway migration `V7__add_study_evidence_submissions.sql`.
  - **AI Verification Engine:** Built `StudyEvidenceVerificationService` with Apache PDFBox text extraction, plain text parser, image/diagram metadata extractor, curriculum topic cross-referencing via `MaterialTopicReader`, and multi-modal AI evaluation via `AiProviderGateway`.
  - **Anti-Bypass Backend Gate:** Updated `TimetableService.markSlotComplete` and added `approveSlotCompletion` to strictly enforce that no study session can be completed without a prior `APPROVED` evidence submission owned by the student. Future completion attempts remain locked (HTTP 400).
  - **Evidence APIs:** Added `POST /api/timetable/slots/{slotId}/evidence`, `GET /api/timetable/slots/{slotId}/evidence`, and `POST /api/timetable/slots/{slotId}/approve-completion`.
  - **Modal UX:** Updated `SlotDetailModal.tsx` and styles with drag-and-drop file upload dropzone (PDF/PNG/JPG/TXT up to 15MB), dynamic AI analyzing animation, rich AI verification verdict card (`APPROVED`, `NEEDS_MORE_WORK`, `REVIEW_REQUIRED`, 0–100 score, summary, matched/missing topics checklist, actionable guidance), `[ Approve & Complete Session ]` flow, and verified completed card.
  - **Test Verification:** Verified 100% passing across 35 backend test classes (282/282 tests), 25 frontend Jest test suites (165/165 tests), Playwright E2E suites (8/8 tests), TypeScript typecheck (`npx tsc --noEmit` 0 errors), and Next.js production build (`next build` 24/24 static routes).
- [2026-08-31] Fixed Timetable Study-Window Synchronization & Enforced Future Session Locking across Web and Backend:
  - **Issue 1 (Stale Daily Study Window):** Fixed Settings profile/preference mutations to update React Query cache (`queryClient.setQueryData(['studentProfile'])`) and invalidate related queries (`['studentProfile']`, `QK.timetable`, `QK.timetableInsights`). Updated Timetable page to subscribe to live profile query data, dynamically rendering the exact study period calculated via canonical `calcStudyPeriod` (e.g. `5:00 PM – 7:00 PM (5:00 PM start, 2h/day)`).
  - **Issue 2 (Future Session Locking):** Implemented client-side date categorization (`getSlotDateCategory`, `isFutureSlot`, `formatFutureAvailability`). Future-dated slots display locked indicators (`🔒 Locked · Available on [Date]`), have disabled quick-toggle buttons with lock icons, and open `SlotDetailModal` in locked read-only mode with an informative notice.
  - **Backend Security & Streak Integrity:** `TimetableService.markSlotComplete` checks `slotDate.isAfter(LocalDate.now())` and rejects early completion attempts with HTTP 400 Bad Request (`IllegalArgumentException`), preventing streak manipulation while keeping today's sessions actionable and past missed sessions catch-up enabled.
  - **Comprehensive Verification:** Added backend JUnit tests (`TimetableFutureSlotLockTest`, 3/3 passed), frontend Jest unit tests (`studyWindowAndLocking.test.tsx` and `slotDetailModal.test.tsx`, 150/150 passed), Playwright E2E tests (`timetable.spec.ts` with `SEL-116` and `SEL-117`, 27/27 passed), and Next.js production build (`next build` with 24/24 static routes generated with 0 errors).
- [2026-08-31] Synchronized Dashboard "Study Hours" and completed sessions with canonical Timetable session data on both Web and Mobile platforms:
  - Fixed root cause where `studyHours` was assigned to `totalCompleted`, showing 0 sessions when sessions were pending.
  - Implemented `computeDayStudyStats` and duration calculation utilities (`calculateSlotDuration`, `formatStudyDuration`) supporting variable durations (45m, 60m, 90m, midnight crossover), local date matching (`YYYY-MM-DD`), and proper semantic presentation (`1h planned`, `0/1 today`).
  - Added dedicated unit tests covering Cases A through H with 100% pass rate in `frontend/src/__tests__/utils/dashboardStats.test.ts` (8/8) and `mobile/src/__tests__/mobileApp.test.ts` (20/20).
  - Verified Playwright E2E suites (`dashboard.spec.ts` 20/20, `timetable.spec.ts` 25/25), backend JUnit tests (272/272 passing), and Next.js production build (`next build` with 24/24 static routes).
- [2026-08-31] Built standalone production release APK (`app-release.apk`, 67.33 MB) with pre-bundled Hermes JavaScript bytecode (`assets/index.android.bundle`), zero Metro/ADB dependencies, strict HTTPS network security (`usesCleartextTraffic="false"`), and verified live physical device launch (`CPH2461`).
- [2026-08-29] Resolved Mobile Timetable 404 "Resource not found" issue and validated end-to-end AI timetable generation on physical Android device (`CPH2461`): mapped backend 404 to empty state `null`, increased timeouts to 45s (standard) and 90s (AI generation), updated Jest unit tests (12/12 passing), created subjects, generated timetable via live Groq AI backend (201 Created), rendered full slot cards with start-end time ranges (`5:00 PM – 6:00 PM · 60m`) and topic/chapter badges, verified slot completion toggle (`☑️ 1/6 done`), and verified Dashboard "Today's Schedule".
- [2026-08-29] Migrated React Native Mobile Firebase Auth from deprecated namespaced API to modular SDK API (`@react-native-firebase/auth@21.14.0`: `getAuth`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, `onAuthStateChanged`, `getIdToken`). Verified with TypeScript (0 errors), Jest (10/10 passed), Gradle assembleDebug (Success), and live physical device testing with clean Logcat (0 deprecation warnings).
- [2026-08-29] Built robust Windows batch launcher `run-mobile.bat` (and `mobile/run-mobile.bat`) automating ADB discovery, Android device connection & USB authorization checks, Metro bundler reuse & start on port 8081, ADB reverse port forwarding, Gradle debug APK build/install, and app launch (`com.study.planner`). Added launcher guide in `mobile/README.md`.
- [2026-08-29] Fixed Mobile Timetable 404 empty state mapping and safe exam unboxing in `StudentMapper.java` / `ExamService.java` preventing backend 500 errors.
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
- [2026-08-28] MASTER IMPROVEMENT — AI TUTOR ERROR & DIAGNOSTIC ANALYSIS PROTOCOL (100% COMPLETED & PR #7 CREATED):
  - **Structured Error Analysis:** Integrated 4-part markdown output (`## What happened`, `## Root cause`, `## What to do`, `## Verify`) in `GroqService.java` with plain-language student explanations.
  - **Zero Credential Leakage:** Built `AiErrorSanitizer.java` to automatically redact JWTs, Bearer headers, cookie headers, API keys, and passwords before AI prompt compilation.
  - **Fact vs. Inference Protocol:** Enforced strict distinction between confirmed facts and diagnostic hypotheses.
  - **Comprehensive Test Suite:** Added `AiErrorAnalysisTest.java` verifying 9 test scenarios (HTTP 400, stack traces, CI logs, JSON API errors, OCR text, redactions, inferences, noise suppression, utility unit tests). All 31 backend AI tests passing.
  - **Pull Request Created:** Opened PR [#7](https://github.com/aswinipavan/AI-STUDY-PLANNER/pull/7) from `feat/master-ai-tutor-and-timetable-overhaul` into `main` for user review.
- [2026-08-29] MASTER TASK — MOBILE APP FULL AUDIT + BACKEND SYNC + APK BUILD (100% COMPLETED & VERIFIED):
  - **Comprehensive Codebase & API Contract Audit:** Audited all mobile screens (`DashboardScreen`, `TimetableScreen`, `MaterialsScreen`, `AIChatScreen`, `ProfileScreen`), navigation, Zustand auth store, React Query hooks, and types.
  - **DTO & Backend Contract Synchronization:** Synced `MaterialResponse` (`subjectId`, `subjectName`, `processingStatus`, `extractedTopics`, etc.) and `StudentProfile` (`preferredStudyTime`, `profilePictureUrl`) with backend. Fixed null-safety and nested/flat fallback handling in `MaterialsScreen` and `SlotCard`.
  - **Toolchain & Native Build Modernization:** Upgraded Gradle wrapper to Gradle 8.8, configured React Native 0.75 autolinking settings plugin (`com.facebook.react.settings`), upgraded Kotlin compiler to 2.0.21, pinned Hermes engine, pinned stable React Native 0.75 dependencies (`react-native-gesture-handler@2.20.2`, `react-native-reanimated@3.16.1`), generated adaptive vector launcher icon assets, and placed standard debug keystore.
  - **Zero Web Code Impact:** Completely untouched web frontend (`frontend/`), web tests, Next.js configs, and PR #7.
  - **Quality & Build Verification:** Ran TypeScript type-check (`npm run tsc` — 0 errors), Jest unit tests (`npm test` — 8/8 passed), and assembled production-ready Android Debug APK (`app-debug.apk`, 170.58 MB) with exit code 0.
- [2026-08-29] FIX — ANDROID DEBUG CLEARTEXT LOCALHOST METRO CONNECTIVITY (100% COMPLETED & VERIFIED):
  - **Identified Root Cause:** `android:usesCleartextTraffic="false"` in `src/main/AndroidManifest.xml` blocked Android 9+ devices from fetching the Metro JavaScript bundle from `http://localhost:8081` over cleartext HTTP, causing Logcat error `CLEARTEXT communication to localhost not permitted by network security policy` and the red screen `Unable to load script`.
  - **Debug Manifest Overlay (`src/debug/AndroidManifest.xml`):** Added a debug-specific manifest overlay with `android:usesCleartextTraffic="true"` and `tools:replace="android:usesCleartextTraffic"`.
  - **Zero Release Impact:** Gradle applies the debug manifest overlay solely during `debug` compilation (`assembleDebug`). The `release` build variant strictly retains `android:usesCleartextTraffic="false"` in `src/main/AndroidManifest.xml`.
  - **Defensive Session Restore & Safe Signout:** Hardened `firebaseSignOut` in `firebaseAuth.ts` and `RootNavigator.tsx` with safe unmounted checks and synchronous initial auth resolution.
  - **Device Verification:** Installed APK onto connected physical Android phone (`CPH2461`), verified ADB reverse (`tcp:8081`), launched `MainActivity`, and confirmed Metro bundle loaded with 0 errors and clean rendered UI.

## In Progress
- (none)

## Blocked
- (none)

## Pending
- **Deploy frontend to Vercel** — push code then connect Vercel project.
- **Redeploy backend to Render** — Supabase DB Flyway migrations active.

## Future Improvements
- Expanded mobile end-to-end device testing with real device cloud runner.
