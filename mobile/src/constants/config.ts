/**
 * Application configuration constants.
 *
 * BACKEND_URL: Confirmed production Render URL (verified from frontend/.env.local 2026-08-14)
 * Old URL ai-study-planner-hp0e.onrender.com was deprecated — do NOT use it.
 */
export const CONFIG = {
  BACKEND_URL: 'https://aistudyplannerbackend.onrender.com',

  /** Axios timeout for standard requests */
  REQUEST_TIMEOUT_MS: 15000,

  /** Longer timeout for AI/Groq endpoints that can take 10-15s */
  AI_REQUEST_TIMEOUT_MS: 30000,

  /** React Query stale times */
  STALE_TIME: {
    PROFILE: 5 * 60 * 1000,      // 5 min
    SUBJECTS: 5 * 60 * 1000,     // 5 min
    TIMETABLE: 2 * 60 * 1000,    // 2 min
    EXAMS: 2 * 60 * 1000,        // 2 min
    MOTIVATION: 60 * 60 * 1000,  // 1 hour (backend caches by date)
  },

  /** Firebase project — study-planner-ec1d2 */
  FIREBASE: {
    PROJECT_ID: 'study-planner-ec1d2',
    AUTH_DOMAIN: 'study-planner-ec1d2.firebaseapp.com',
  },
} as const;
