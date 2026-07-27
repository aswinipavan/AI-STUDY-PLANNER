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

- [2026-07-27] BUG-007 Fixed: Notification preferences API endpoint implemented. Backend: NotificationPreferencesRequest DTO, Student entity columns, StudentService method, PUT /api/students/me/notifications endpoint. Frontend: settings page wired to API with success toast.
- [2026-07-27] BUG-008 Fixed: Sidebar.tsx TypeScript variable collision (setMounted from store vs local state).
- [2026-07-27] Committed 2 sessions of work to GitHub (commits 1305c17 and 2bc880e).

## In Progress
- (none)

## Blocked
- BUG-006: Timetable error toast needs full optimistic update rollback.

## Pending
- **Deploy frontend to Vercel** — push code then connect Vercel project.
- **Redeploy backend to Render** — BUG-007 requires new columns in Supabase DB (Hibernate ddl-auto=update will auto-add them on restart).
- Add `spring-security-test` already in pom.xml → Run MaterialControllerTest on local backend.

## Future Improvements
- Add comprehensive JUnit/Mockito tests for backend services.
- Performance page: Add marks entry form so users can record their own exam scores.
- Playwright E2E automation tests.
