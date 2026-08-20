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


| BUG-009 | Low | `@types/jest` excluded from tsconfig — test files could not resolve jest globals (`describe`, `it`, `expect`, `jest`) | `tsconfig.json` | **Fixed 2026-08-03** | Yes |
| RCA-001 | High | Backend CORS ALLOWED_ORIGINS points to itself instead of frontend | .env.example | Pending | No | No | |

| BUG-004 | CRITICAL | Firebase API key corrupted (FiOW vs FIoW) | frontend/.env.local | Fixed | Yes | Yes | No |
| BUG-005 | CRITICAL | Render deployment timeout (Status 137) | application.properties | Fixed | Yes | Yes | No |
| BUG-010 | Medium | AuthService throws RuntimeException on FirebaseAuthException, causing HTTP 500 instead of 401 | `AuthService.java` | Fixed | Yes |
| BUG-011 | Medium | AuthControllerTest fails to boot or gets 403/401 due to missing SecurityConfig import and CSRF/auth | `AuthControllerTest.java`, `SecurityConfig.java` | Fixed | Yes |
| BUG-012 | High | Timetable generation HTTP 500 when Groq service fails; subjectIds ignored; marks DB query in loop | `TimetableService.java` | Fixed | Yes |
| BUG-013 | High | Exam creation HTTP 500 on validation error due to missing IllegalArgumentException handler | `GlobalExceptionHandler.java` | Fixed | Yes |
| BUG-014 | Medium | Profile update field name mismatch (`name` vs `fullName`) & missing fields in Settings | `settings/page.tsx`, `auth.api.ts`, `authStore.ts`, `api.types.ts` | Fixed | Yes |
| BUG-015 | Medium | Topbar theme toggle not applying `.dark` class to DOM & missing avatar/bell menus | `ThemeApplier.tsx`, `layout.tsx`, `Topbar.tsx` | Fixed | Yes |
| BUG-016 | High | Chat history endpoint LazyInitializationException HTTP 500 on Student relationship | `ChatMessageResponse.java`, `AiAssistantService.java`, `AiAssistantController.java` | Fixed | Yes |
| BUG-017 | High | Material upload PUT failure to Supabase Storage due to missing authorization headers | `MaterialService.java`, `application.properties`, `useMaterials.ts` | Fixed | Yes |
| BUG-018 | Medium | ManualTokenGenTest executed during automated Maven builds and failed due to test context configuration | `ManualTokenGenTest.java` | Fixed | Yes |
| BUG-019 | Low | Login test empty form submission failed in JSDOM due to HTML5 required attribute preventing button click | `src/__tests__/app/auth/login.test.tsx` | Fixed | Yes |