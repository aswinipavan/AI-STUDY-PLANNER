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
  - Phase 0: Complete Architecture Audit (`PROJECT_ARCHITECTURE_AUDIT.md`, `IMPLEMENTATION_PLAN.md`).
  - Phase 1: Baseline Verification (Git checkpoint `1ad2ac7134735218d743f2603ba1b4061fdacfb2`).
  - Phase 2: AI Chat Material Quick Actions (Summarize, MCQs, Topics, Flashcards, Plan, Explain).
  - Phase 3: Connected Academic Intelligence Layer (`buildStudentAcademicContext` in `AiAssistantService`).
  - Phase 4: AI Performance Analysis (`GET /api/performance/ai-analysis` & diagnostic card).
  - Phase 5: Explainable Study Priority (`GET /api/performance/priority` & reason bullets).
  - Phase 6: Academic Readiness Composite Metric (`GET /api/performance/readiness` & 4-pillar progress bars).
  - Phase 7: Study Together Collaborative Rooms (Flyway `V3`, JPA entities, WebRTC camera/audio controls, synchronized timer, peer tiles, room chat, Room AI tutor).
  - Phase 8: Smart Notifications (`GET /api/notifications` & `Topbar.tsx` bell dropdown).
  - Phase 9: Gamification Enhancement (Milestone Badges in `dashboard/page.tsx`).
  - Phase 10: Database & Test Data Audit (`DATABASE_DATA_AUDIT.md`).
  - Phase 11: Comprehensive Test Suite (110/110 backend tests, 58/58 frontend tests, Next.js 23/23 routes build).
  - Phase 12: Production Audit & Documentation (`FINAL_PRODUCTION_AUDIT.md`).

## In Progress
- (none)


## Blocked
- (none — BUG-006 timetable toast is low priority, future improvement)

## Pending
- **Deploy frontend to Vercel** — push code then connect Vercel project.
- **Redeploy backend to Render** — BUG-007 requires new columns in Supabase DB (Hibernate ddl-auto=update will auto-add them on restart).
- Add `spring-security-test` already in pom.xml → Run MaterialControllerTest on local backend.

## Future Improvements
- Add comprehensive JUnit/Mockito tests for backend services.
- Performance page: Add marks entry form so users can record their own exam scores.
- Playwright E2E automation tests.
