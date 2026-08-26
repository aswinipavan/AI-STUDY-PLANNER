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

  /**
   * Longer timeout for the endpoints that generate text with an LLM.
   *
   * The backend tries AgentRouter (22s read ceiling) and, if it fails, falls back
   * to Groq (30s read ceiling plus one 2.5s retry on a 429). That worst case is
   * 54.5s, so this must stay above it: a client that gives up sooner would abandon
   * a request the fallback was about to answer, which looks to the student like the
   * AI is broken. Raise this first if the backend ceilings are ever raised.
   */
  AI_REQUEST_TIMEOUT_MS: 60000,

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
