# Next Task

**Updated:** 2026-08-15
**Current Status:** Web Application Root-Cause Audit & Repairs COMPLETE (Verified).

---

## Current Status Summary

- **Current Module:** Web Application Root-Cause Audit & Repair
- **Current Status:** ✅ Complete & Build-Verified
- **Last Completed:**
  - Fixed Timetable generation 500 error (Groq try-catch fallback, hoisted subject averages query, filtered `subjectIds`).
  - Fixed Exam creation 500 error (added `IllegalArgumentException` handling in `GlobalExceptionHandler.java` mapping to 400).
  - Fixed Profile/Settings (added College, Academic Year, Department, Phone; normalized field contracts).
  - Fixed Header Controls (added `ThemeApplier.tsx` DOM bridge, upcoming exams notification dropdown, avatar dropdown menu).
  - Fixed AI Chat history 500 error (introduced `ChatMessageResponse` DTO, chronological sorting, fixed hook anti-pattern).
  - Fixed Material Upload 401 (added `supabase.anon-key` config + authorization headers in `useMaterials.ts`).
  - Validated both builds:
    - Backend: `.\mvnw.cmd clean compile` -> `BUILD SUCCESS` (exit code 0)
    - Frontend: `npm run build` -> Next.js Turbopack 22/22 routes generated (exit code 0)

---

## Next Action: Deployment & Live Production Verification

1. **Deploy Frontend & Backend:**
   - Commit & push changes to GitHub.
   - Verify Vercel auto-deployment of Next.js frontend.
   - Verify Render auto-deployment of Spring Boot backend.
   - Ensure Render environment variables include `SUPABASE_ANON_KEY`.

2. **Live Functional Smoke Test Matrix:**
   - **Timetable:** Generate timetable with selected subjects and duration -> verify slots render with fallback/AI topics.
   - **Exams:** Add upcoming exam -> verify no 500, displays on exams page and Topbar notification bell.
   - **Profile/Settings:** Update college name and department -> verify persistence across reloads.
   - **Theme:** Click sun/moon toggle in Topbar -> verify immediate theme switch across whole app.
   - **Notifications:** Click bell in Topbar -> verify upcoming exams listed with countdowns.
   - **Avatar Menu:** Click avatar in Topbar -> verify Settings / Logout links work.
   - **AI Chat:** Start new chat, send message, reload -> verify history loads without 500.
   - **Materials:** Upload study document -> verify upload succeeds to Supabase Storage.

3. **Priority:** High (Production Release)
4. **Estimated Time:** 15-20 minutes
5. **Blockers:** None
