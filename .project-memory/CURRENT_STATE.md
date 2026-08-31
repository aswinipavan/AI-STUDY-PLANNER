# Current State

## Current Build Status
- **GitHub Status:** Pull Request [#7](https://github.com/aswinipavan/AI-STUDY-PLANNER/pull/7) (`feat/master-ai-tutor-and-timetable-overhaul` -> `main`) has been successfully **MERGED** into `main` (commit `806c14d`). All master AI Tutor, Timetable horizon, and CI/CD changes are now live on `main`.
- **Automated Test Suite & Quality Gate:** 100% genuine executable tests across all layers (456 total tests, 448 passed, 0 failures, 8 skipped in offline profile). Zero hardcoded or simulated test results.
- **Excel Test-Case Documentation Portfolio:** 7 professional OpenPyXL workbooks in `testing/reports/` with **1,905 total test cases (300+ per sheet)** with 100% traceability to source files, runnable commands, defect tracking, and regression matrix.
- **Frontend:** Next.js 16.2.9 (App Router) + Turbopack + React 19. Fully builds with 0 errors (`npm run build`, 24/24 routes generated cleanly), 0 ESLint errors (`npm run lint`), 0 TypeScript errors (`npx tsc --noEmit`), 150/150 Jest tests passed (`npm test`), and 78/78 Playwright E2E tests passed.
- **Backend:** Spring Boot 3.2.4 (Java 17). Builds and tests with 0 errors (34 test classes, 275 passed, 0 failures, 0 errors, 8 skipped via `mvnw test`). Future slot completion attempts strictly rejected with HTTP 400 Bad Request.
- **Mobile (Android):** React Native 0.75.5 with TypeScript (`npm run tsc` passes with 0 errors), ESLint (0 errors), 20/20 Jest unit tests passing, and Standalone Production Release APK (`app-release.apk`, 67.33 MB) successfully compiled, assembled, and verified on connected physical Android device. Strict HTTPS for production Render backend (`https://ai-study-planner-hp0e.onrender.com`). Fully synchronized planned study duration and session metrics with canonical timetable API.
- **Database:** Supabase PostgreSQL connected and stable with Flyway migrations `V1`, `V2`, `V3`, `V5` (15 tables) and `ddl-auto=validate`. Local H2 file persistence at `./data/studyplanner.mv.db`.
- **Storage:** Local filesystem storage active for local development and offline mode (`/api/files/...`); Supabase Storage configured with anon key for cloud deployments (`materials/` and `avatars/` buckets).
- **Test Reporting System:** Dynamic automated aggregator `testing/scripts/generate_test_reports.py` parsing Surefire XML, Jest JSON, and Playwright JSON directly into `testing/reports/MASTER_TEST_REPORT.md` and machine-readable `TEST_EXECUTION_SUMMARY.json`.
- **Excel Generator Script:** `testing/scripts/generate_300_workbooks.py` generating `MASTER_Test_Cases.xlsx` (Summary, 6 domain sheets, Defects, Regression) and 6 individual domain workbooks (300 cases each).
- **GitHub Actions CI Pipeline (`.github/workflows/ci.yml`):** Unified 5-parallel-fanout to 1-converged-master architecture:
  - 🌐 `selenium-e2e` (Selenium / Playwright E2E Web Suite)
  - 📱 `appium-mobile` (Appium Mobile Suite - 300+ Cases)
  - ⚡ `load-performance` (Load & Performance Suite)
  - 🎨 `frontend-uiux` (Frontend UI/UX Suite - 300+ Cases)
  - ⚙️ `backend-api-db` (Backend API & DB Suite - 405+ Cases)
  - $\rightarrow$ 🏆 `master-summary` (Master Execution Summary converging all 5 suites, generating `Master_Execution_Summary.md/.html` and step summaries)

## AI Tutor Chat Layout & Interaction
- **Sticky Composer Architecture:** The message composer is fixed/anchored at the bottom of the chat viewport (`position: sticky; bottom: 0; z-index: 20;`). Scrolling through long message conversations scrolls solely within the internal scroll container (`.messageList`) without moving the input box or shifting page layout.
- **Clean Model Header:** Technical provider subtitles removed; clean avatar and clean title display.
- **Independent Scroll Areas:** Chat conversation history and sidebar session drawer maintain independent, overflow-contained scrollbars.

## Materials Management & Subject Filtering
- **Canonical Subject Architecture:** Study materials maintain a direct foreign key relationship (`subject_id`) to the `Subject` entity in the database.
- **Top-Level DTO Contract:** `MaterialResponse.java` includes `subjectId` (UUID) and `subjectName` (String) at root level alongside the nested `subject` object, with fallback getters.
- **Student Ownership Validation:** Upload and metadata endpoints verify that `subjectId` belongs to the authenticated `studentId` before saving.
- **Backend Filtering:** `GET /api/materials?subjectId={uuid}` and `GET /api/materials/subject/{uuid}` query `findAllByStudentIdAndSubjectIdOrderByCreatedAtDesc`, returning ordered results isolated to the student.
- **Frontend Resilient Filtering:** `mapMaterialFromBackend` in `materials.api.ts` maps `subjectId`, `subjectName`, and `subject`. Client-side filtering in `materials/page.tsx` resolves `mat.subjectId || mat.subject?.id`, guaranteeing instant and persistent filtering when toggling between "All Subjects" and specific subject folders.
- **Visual Feedback:** Each `MaterialCard.tsx` renders a dedicated user-selected subject badge (`<BookOpen /> {material.subjectName}`).

## Authentication & Profile Persistence
- **Single Firebase UID Identity:** Google OAuth & Email/Password map deterministically to a single `Student` record by `firebase_uid`. Multiple logins with the same Google account always resolve to the identical UUID without duplicate student creation or profile overwrite.
- **Full Profile Field Durability:** All 6 profile fields (`fullName`, `collegeName`, `semester`, `department`, `phoneNumber`, `profilePictureUrl`) persist to database and survive logout, hard reload, server restart, and re-login.
- **Sanitization & Robust Serialization:** Custom Jackson deserializer parses strings (`"1st Year"`, `"Semester 6"`, `"6"`) and integers safely. Phone numbers convert empty strings to SQL `null` to avoid unique constraint violations and enforce uniqueness across active users.
- **Live Profile Synchronization:** Preferences saved in Settings immediately propagate via React Query (`queryClient.setQueryData(['studentProfile'])`) and invalidate related timetable queries across all dashboard tabs without stale state.

## Timetable Dynamic Horizon, Start-End Display, Slot Details & Future Session Locking
- **Dynamic Study Window Calculation:** Timetable study window banner dynamically mirrors stored student preferences (`preferredStudyTime` + `availableHoursPerDay`, e.g. `5:00 PM – 7:00 PM (5:00 PM start, 2h/day)`) and updates reactively on preference change.
- **Future Session Locking:** Future-dated slots (`date > today`) display locked state (`🔒 Locked · Available on [Date]`), render disabled quick-toggle buttons with lock icons, and open the `SlotDetailModal` in read-only locked mode with an informative notice.
- **Backend Lock Enforcement:** `TimetableService.markSlotComplete` verifies slot date against `LocalDate.now()`, rejecting future session completion attempts with HTTP 400 Bad Request and protecting student study streaks from premature manipulation.
- **Full Exam-Deadline Horizon:** Dynamic horizon derived from student's target date or furthest exam deadline (14d, 30d, 60d, 90d); never truncated or capped to 1 week. Pre-exam revision dedicated on the eve of each exam.
- **Calendar Month & Date Display:** Calendar displays month headers and concrete dates with month pills across boundaries. Multi-week dates do not collapse into single week columns.
- **Week Switcher & Pager:** Single week view with Prev/Next week navigation, quick jump tabs (`[Today]`, `[Week 1]`, `[Week 2]`), and `[All Weeks View]` to view the complete multi-week schedule continuously.
- **Full Start–End Time Range:** Displays full slot time (e.g. `6:00 PM – 7:00 PM`) and duration badge (`60m`), derived from user's preferred start time + target duration / session style.
- **Study Session Detail Modal (`SlotDetailModal.tsx`):** Clicking any slot card opens a rich modal rendering: Subject badge, formatted date, full time range, duration, Status badge, **TODAY'S TOPIC**, **SOURCE MATERIAL**, **CHAPTER**, **DIFFICULTY**, **WHAT TO STUDY**, and **SELECTION REASON & EXAM RELEVANCE**.
- **Missed Session & Catch-up History:** Past uncompleted slots are marked `status = 'missed'` and preserved in history. The active day displays an urgent `🔴 MISSED — COMPLETE TODAY` badge on catch-up slots.
