# Deployment Status

## Infrastructure
- **Firebase:** Connected (Used for Authentication).
- **Supabase:** Connected (Used for PostgreSQL database).
- **Groq:** API Key configured (Used for AI Features).

## Environments
- **Local:** Configured (`.env` file required).
- **Staging:** Not Started.
- **Production:** Backend deployed to Render. Frontend pending.

## Environment Variables
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `GROQ_API_KEY`
- `JWT_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `SUPABASE_DB_URL`
- `SUPABASE_DB_USER`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGINS`

## Deployment Steps
1. Push to GitHub.
2. (Pending) Setup Vercel / Netlify for Frontend.
3. (Pending) Setup Render / Railway for Backend.
