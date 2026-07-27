# Bug Tracker

| Bug ID | Severity | Root Cause | Files | Status | Verified |
|--------|----------|------------|-------|--------|----------|
| BUG-001 | High | Supabase project paused / Wrong Password | `.env` | Fixed | Yes |
| BUG-002 | High | Firebase requires `serviceAccountKey.json` on classpath but it is passed via base64 env | `FirebaseConfig.java` | Fixed | Yes |
| BUG-003 | Medium | `spring-jcl` conflict with `commons-logging` | `pom.xml` | Fixed | Yes |
| BUG-004 | High | Dashboard showed hardcoded fake stats (14.5hrs, 24 tasks, 3 exams) and fake Focus Areas (Physics/Maths/Chemistry) — not from user data | `dashboard/page.tsx` | **Fixed 2026-07-24** | Yes |
| BUG-005 | Low | `/timetable/generate` Step 1 shows empty list with no guidance when user has no subjects | `timetable/generate/page.tsx` | Already handled in code (link to /subjects present) | Yes |
| BUG-006 | Low | Optimistic update error swallowed silently in timetable slot toggle | `timetable/page.tsx` | Open — logged to console only | No |
| BUG-007 | Medium | Notification toggles (email/push) are local state only — reset on refresh, not persisted to backend | `settings/page.tsx`, `auth.api.ts`, `StudentController.java`, `StudentService.java`, `Student.java` | **Fixed 2026-07-27** | No (needs live backend redeploy) |
| BUG-008 | Low | Sidebar.tsx TypeScript error TS2451 — local `setMounted` collided with store `setMounted` | `Sidebar.tsx` | **Fixed 2026-07-27** | Yes |
