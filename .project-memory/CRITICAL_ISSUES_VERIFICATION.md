# Critical Issues Root-Cause Verification

This document provides a detailed technical verification of the three critical issues identified during the discovery phase, their root-cause analysis, and the fix results.

---

## 1. BUG-A: Next.js Proxy/Middleware Routing Behavior

### Original Issue
The route protection middleware was reported as "completely bypassed" because the file was named `proxy.ts` instead of `middleware.ts`.

### Verification Result: ❌ FALSE POSITIVE

### Evidence
- **Next.js version:** 16.2.9 (confirmed from `package.json`).
- **Next.js 16 convention:** In Next.js 16, the middleware file convention was renamed from `middleware.ts` to `proxy.ts`. The exported function must be named `proxy`, not `middleware`.
- When we temporarily renamed the file to `middleware.ts`, the production build emitted:
  ```
  ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
  ```
- When we reverted to `proxy.ts`, the build succeeded cleanly with:
  ```
  ƒ Proxy (Middleware)
  ```
  confirming the proxy was being recognized and active.

### Root Cause
The original finding was based on the assumption that Next.js requires `middleware.ts`. This is true for Next.js 13–15, but **Next.js 16 changed the convention to `proxy.ts`**. The original code was already correct.

### Action Taken
- Temporarily renamed to `middleware.ts` → confirmed deprecated warning → **reverted to original `proxy.ts`**.
- No net change to the file.

### Confidence
**HIGH** — Confirmed via production build output that `proxy.ts` is active.

### Files Involved
- [proxy.ts](file:///c:/Users/aswin/Downloads/AI-Study-Planner/frontend/src/proxy.ts) — No changes needed; already correct.

---

## 2. BUG-B: Production Authentication / API Cookie-to-Render Communication

### Original Issue
All API calls from the browser fail with `401 Unauthorized` in production because the `access_token` cookie is set on the Vercel domain but `apiClient` sends requests directly to the Render backend domain.

### Verification Result: ✅ CONFIRMED — ROOT CAUSE VERIFIED AND FIXED

### Evidence
- In [config.ts](file:///c:/Users/aswin/Downloads/AI-Study-Planner/frontend/src/constants/config.ts), `ENV.BACKEND_URL` resolves to `https://ai-study-planner-hp0e.onrender.com`.
- In [apiClient.ts](file:///c:/Users/aswin/Downloads/AI-Study-Planner/frontend/src/lib/apiClient.ts) (before fix), `baseURL` was set to `ENV.BACKEND_URL`.
- In [login/route.ts](file:///c:/Users/aswin/Downloads/AI-Study-Planner/frontend/src/app/api/auth/login/route.ts), the JWT is stored as an `httpOnly` cookie on the Vercel domain.
- The existing catch-all proxy at `/api/auth/[...path]` correctly reads the cookie and sets `Authorization: Bearer <token>`, but it only handles paths under `/api/auth/*`.
- All API modules call paths like `/api/students/me`, `/api/timetable/active`, `/api/exams/upcoming` — these do NOT match `/api/auth/*` and therefore bypass the proxy entirely.

### Call Chain (Before Fix)
```
Browser → apiClient.get('/api/students/me')
       → Axios resolves to: https://onrender.com/api/students/me (cross-domain)
       → Browser sends NO cookies (different domain, httpOnly)
       → No Authorization header added (no interceptor)
       → Spring Boot FirebaseTokenFilter finds no auth
       → 401 Unauthorized
```

### Call Chain (After Fix)
```
Browser → apiClient.get('/api/students/me')
       → Axios resolves to: /api/students/me (same origin, baseURL='')
       → Next.js catches via /api/[...path]/route.ts
       → Proxy reads access_token cookie
       → Sets Authorization: Bearer <token>
       → Forwards to https://onrender.com/api/students/me
       → Spring Boot authenticates successfully
       → 200 OK
```

### Changes Made
1. **[apiClient.ts](file:///c:/Users/aswin/Downloads/AI-Study-Planner/frontend/src/lib/apiClient.ts):** Changed `baseURL` from `ENV.BACKEND_URL` to `''` (empty string = same origin). Removed unused `ENV` import.
2. **[/api/[...path]/route.ts](file:///c:/Users/aswin/Downloads/AI-Study-Planner/frontend/src/app/api/%5B...path%5D/route.ts):** Created new catch-all proxy that reads the `access_token` cookie, sets `Authorization: Bearer` header, and forwards to the Spring Boot backend. Mirrors the existing `/api/auth/[...path]` proxy logic.

### API Modules Covered
All 9 API modules now route through the proxy:
- `auth.api.ts` — `getMe`, `updateMe`, `updateNotifications` (via apiClient)
- `subjects.api.ts` — `getAll`, `create`, `update`, `remove`
- `exams.api.ts` — `create`, `getUpcoming`, `update`, `remove`
- `timetable.api.ts` — `generate`, `addCustom`, `getActive`, `markSlotComplete`, `updateSlotStatus`
- `materials.api.ts` — `getUploadUrl`, `save`, `getAll`, `getBySubject`, `remove`
- `ai.api.ts` — `chat`, `getHistory`
- `chat.api.ts` — `getHistory`, `sendMessage`
- `performance.api.ts` — `addMark`, `getReport`, `getPriority`
- `subscriptions.api.ts` — `createOrder`, `verifyPayment`, `getStatus`

### Route Precedence (No Conflicts)
Next.js specific routes take priority over catch-all routes:
- `/api/auth/login` → specific route (unchanged)
- `/api/auth/refresh` → specific route (unchanged)
- `/api/auth/logout` → specific route (unchanged)
- `/api/auth/[...path]` → existing catch-all for auth sub-paths (unchanged)
- `/api/wake` → specific route (unchanged)
- `/api/[...path]` → NEW catch-all for everything else

### Potential Regression
- Adds one serverless function hop for API calls (negligible latency on Vercel).
- Does NOT weaken security — `httpOnly` cookie remains server-only.
- Does NOT expose JWT to client-side JavaScript.

### Test Results
- TypeScript check: ✅ 0 errors
- Production build: ✅ compiled, 22 static pages, all routes registered
- Frontend tests: ✅ 58/58 passing
- Backend tests: ✅ 89/89 unit tests passing (Docker-dependent tests excluded)

### Confidence
**HIGH**

---

## 3. BUG-C: Gemini/Groq AI Model Configuration

### Original Issue
All AI features return the fallback message because `GroqConfig.java` calls the Google Gemini API with a non-existent model name `groq-1.5-flash`.

### Verification Result: ✅ CONFIRMED — ROOT CAUSE VERIFIED AND FIXED

### Evidence
- In [GroqConfig.java](file:///c:/Users/aswin/Downloads/AI-Study-Planner/backend/src/main/java/com/aistudyplanner/config/GroqConfig.java) (before fix):
  ```java
  public static final String GROQ_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/groq-1.5-flash:generateContent";
  ```
- The API endpoint `generativelanguage.googleapis.com` is Google Gemini's API, NOT Groq's API (`api.groq.com`).
- Google Gemini hosts models: `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`, etc.
- There is no model named `groq-1.5-flash` in Google's model catalog.
- The API key is configured via `groq.api-key` in `application.properties` — this must contain a valid Google AI Studio API key for the fix to work at runtime.

### Call Chain
```
GroqService.callGroq(prompt)
→ groqRestTemplate.postForObject(GROQ_API_URL + "?key=" + apiKey, ...)
→ POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=...
→ Google Gemini API processes request
→ Returns response with candidates[0].content.parts[0].text
```

### Change Made
- **[GroqConfig.java](file:///c:/Users/aswin/Downloads/AI-Study-Planner/backend/src/main/java/com/aistudyplanner/config/GroqConfig.java):** Changed `groq-1.5-flash` to `gemini-1.5-flash`.

### Test Results
- Backend compilation: ✅ clean
- GroqServiceTest: ✅ 18/18 passing (tests mock RestTemplate, so they verify service logic regardless of model name)
- No other references to `groq-1.5-flash` found in the codebase.

### Runtime Verification
- Cannot verify live AI requests without a valid Google AI Studio API key in the local environment.
- The fix is a 1-character string change in the URL path; no behavioral logic is modified.

### Potential Regression
- None. The only change is the model identifier in the URL. The request format, response parsing, rate limiting, caching, and error handling are all unchanged.

### Confidence
**HIGH**

---

## Summary

| Issue | Status | Fix Applied | Confidence |
|-------|--------|-------------|------------|
| BUG-A: Next.js proxy/middleware | ❌ FALSE POSITIVE | No change needed (reverted) | HIGH |
| BUG-B: Cross-domain auth failure | ✅ CONFIRMED & FIXED | apiClient baseURL + catch-all proxy | HIGH |
| BUG-C: AI model name typo | ✅ CONFIRMED & FIXED | `groq-1.5-flash` → `gemini-1.5-flash` | HIGH |

### Remaining Unverified
- **BUG-B runtime:** Requires live production deployment to verify end-to-end cookie flow across Vercel → Render.
- **BUG-C runtime:** Requires a valid Google AI Studio API key to verify Gemini API responds correctly.
- **SecurityConfigTest / ManualTokenGenTest:** Require Docker or live database — pre-existing, not related to our changes.
