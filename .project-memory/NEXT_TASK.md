# Next Task

## READY — Deploy to Vercel + Backend Redeploy

All bugs fixed. Next step is production deployment.

### 1. Deploy Frontend to Vercel
- Option A (Recommended): Go to https://vercel.com → Import project from GitHub (aswinipavan/AI-STUDY-PLANNER)
  - Set Root Directory to `frontend`
  - Add all environment variables from `frontend/.env.local` (except secret values, check `.env.local.example`)
  - Vercel will auto-build and deploy
- Option B: `cd frontend && npx vercel --prod`

### 2. Redeploy Backend to Render
- BUG-007 added 2 new DB columns (email_notifications, push_notifications)
- Render needs to pick up the new pom.xml + entity changes
- Trigger a redeploy in Render dashboard → "Deploy latest commit"
- Hibernate `ddl-auto=update` will auto-add the columns on first startup
- **Important**: The `spring-security-test` dependency was also added — backend will rebuild

### 3. Verify After Deploy
1. Sign in at your live Vercel URL
2. Go to /settings → Toggle notification preferences → Click "Save Notification Preferences"
3. Refresh the page — preferences should persist
4. Go to /dashboard — Verify real data shows (not fakes)
5. Go to /materials — Verify AI Summary and AI Category badges show on uploaded materials

## What Was Fixed This Session ✅ (2026-07-27)
- BUG-007: Notification preferences now fully persisted in backend
  - Backend: New `email_notifications` and `push_notifications` DB columns
  - Backend: `PUT /api/students/me/notifications` endpoint
  - Frontend: Settings page loads & saves preferences via new API
- BUG-008: Sidebar.tsx TypeScript collision fixed
- All uncommitted changes from last session committed and pushed (commits 1305c17 + 2bc880e)

## Open Items
- BUG-006: Timetable slot update error toast (still logged to console only)
- MaterialControllerTest: spring-security-test in pom.xml, run `mvn test` in backend/
