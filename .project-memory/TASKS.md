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

## In Progress
- BUG-007: Notification preferences (email/push toggles) are local state only — need backend API endpoint to persist.

## Blocked
- BUG-007: Notification preferences backend endpoint not yet implemented.
- MaterialControllerTest: Blocked on missing `spring-security-test` dependency.

## Pending
- End-to-end testing of authenticated API routes from frontend.
- Implement notification preferences persistence in backend.
- Add `spring-security-test` to pom.xml and run MaterialControllerTest.

## Future Improvements
- Add comprehensive JUnit/Mockito tests for backend services.
- Wire up BUG-006: Show user-visible error toast when timetable slot update fails.
- Performance page: Add marks entry form so users can record their own exam scores.
