# PROJECT CONTEXT
*Generated during system audit for AI Study Planner Web.*

## Architecture
**Frontend:**
- **Framework:** Next.js 16.2.9 (App Router) / React 19.
- **Language:** TypeScript.
- **Styling:** Tailwind CSS (v4) with Framer Motion and React Three Fiber for 3D elements.
- **State Management:** Zustand, React Query for server state.
- **API Communication:** Axios (`apiClient.ts`) communicating with a backend proxy or directly to the backend. Next.js API proxy routes (`src/app/api`) are heavily utilized to avoid exposing CORS to the browser and handle secure httpOnly cookie management.

**Backend (as inferred from proxy and configs):**
- **Framework:** Java Spring Boot.
- **Host:** Render (`https://ai-study-planner-hp0e.onrender.com`).
- **Capabilities:** Auth, Subjects, Materials, Chat (Groq), Timetable, Subscriptions, Performance.

## Authentication Flow
1. **Client:** `Firebase Token` obtained via Google Sign-In or email/password.
2. **Next.js Proxy (`/api/auth/login`):** Validates payload and forwards `firebaseToken` to the Spring Boot backend (`/api/auth/login`).
3. **Backend:** Verifies the Firebase token, creates user session/DB record, and returns an `accessToken` and `refreshToken`.
4. **Next.js Proxy:** Receives backend response, sets `access_token` and `refresh_token` as secure, `httpOnly` cookies, and returns user data to client.
5. **Client Session:** Zustand (`authStore`) caches user data.
6. **Refresh Flow:** Handled by Axios interceptor in `apiClient.ts` hitting `/api/auth/refresh`.

## Database Flow (Inferred)
- **Primary Data:** Stored in the backend database (Supabase/PostgreSQL inferred).
- **Secondary Data:** Firebase is primarily used for Auth, and possibly some cloud functions or realtime aspects, but most core entities (subjects, exams, timetable) rely on standard REST API calls to the Java backend.

## Integrations
- **Groq:** Handled via the backend (or Next.js API) for AI chat & timetable generation.
- **Razorpay:** Payment integration. Client initiates with `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
- **Firebase:** Authentication.
- **Supabase:** Core relational database (managed via Java backend).

## Route Map (Frontend)
- `/(auth)/login` - Login page
- `/(auth)/onboarding` - Onboarding flow
- `/(dashboard)/dashboard` - Main Dashboard
- `/(dashboard)/subjects` - Subjects Listing
- `/(dashboard)/subjects/[id]` - Subject Details
- `/(dashboard)/materials` - Study Materials
- `/(dashboard)/exams` - Exams & Tracking
- `/(dashboard)/timetable` - Timetable View
- `/(dashboard)/timetable/generate` - AI Timetable Generation
- `/(dashboard)/chat` - AI Chat Interface
- `/(dashboard)/chat/[sessionId]` - Chat Session
- `/(dashboard)/performance` - Analytics & Performance
- `/(dashboard)/priority` - Priority Tasks
- `/(dashboard)/subscription` - Subscription / Razorpay Checkout
- `/(dashboard)/settings` - User Settings

## API Map (Next.js Routes)
- `/api/auth/login` - Proxy for backend login & cookie setting
- `/api/auth/logout` - Clear cookies
- `/api/auth/refresh` - Refresh tokens
- `/api/auth/[...path]` - Catch-all auth route
- `/api/proxy/login` - Additional proxy layer

## Known Failures & High-Risk Areas
- **Backend `ALLOWED_ORIGINS`:** Could be misconfigured (using placeholder instead of Vercel production domain).
- **Credentials Rotation (.env exposure):** Keys could be out of sync across Firebase, Supabase, Vercel, and Render.
- **Type Errors:** Next.js build fails due to `StudentProfile` type mismatch in login.
- **Lint Errors:** Incompatible library usage (`useForm().watch()`) with React Compiler.
- **Swallowed Errors:** Empty catch blocks in API and UI layers masking potential underlying issues.

## Unverified Areas
- **Backend Repository:** The Java source code hasn't been inspected (it is hosted separately).
- **Production Environment Variables:** Vercel & Render variables cannot be confirmed purely from source code.
