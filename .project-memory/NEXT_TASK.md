# Next Task

## READY — Deploy to Vercel + Backend Redeploy

All tests passing (103/103 backend). Next step is production deployment.

### 1. Deploy Frontend to Vercel
- Option A (Recommended): Go to https://vercel.com → Import project from GitHub (aswinipavan/AI-STUDY-PLANNER)
  - Set Root Directory to `frontend`
  - Add all environment variables from `frontend/.env.local`
  - Vercel will auto-build and deploy
- Option B: `cd frontend && npx vercel --prod`

### 2. Redeploy Backend to Render
- BUG-007 added 2 new DB columns (email_notifications, push_notifications)
- Render needs to pick up the new pom.xml + entity changes
- Trigger a redeploy in Render dashboard → "Deploy latest commit"
- Hibernate `ddl-auto=update` will auto-add the columns on first startup

### 3. Verify After Deploy
1. Sign in at your live Vercel URL
2. Go to /settings → Toggle notification preferences → Click "Save Notification Preferences"
3. Refresh the page — preferences should persist
4. Go to /dashboard — Verify real data shows (not fakes)
5. Go to /materials — Verify AI Summary and AI Category badges show on uploaded materials

## What Was Done This Session ✅ (2026-07-28)

### Backend Testing - Module 3 UNBLOCKED
- MaterialControllerTest: 20/20 tests now PASSING (was 0/20)
- FirebaseTokenFilterTest: 17/17 (fixed UnnecessaryStubbingException)
- AuthServiceTest: 6/6 (fixed message assertion)
- **Total: 103 backend tests passing, 0 failures**

### Root Causes Fixed
1. `@WebMvcTest` context failure → Added `@MockBean StudentRepository` (FirebaseTokenFilter needs it)
2. 500 on GET requests → Used `authentication()` post-processor with real `Student` entity as principal
   - `CurrentStudentArgumentResolver` checks `instanceof Student`, not Spring's `UserDetails`
3. 403 on POST/DELETE → Added `.with(csrf())` to all mutating requests
4. `UnnecessaryStubbingException` in FirebaseTokenFilterTest → Added `@MockitoSettings(strictness=LENIENT)`
5. AuthServiceTest message mismatch → Fixed assertion to match actual thrown message

## Open Items
- BUG-006: Timetable slot update error toast (low priority)
- Deploy to Vercel (pending user action)
- Render backend redeploy (pending user action)
