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
