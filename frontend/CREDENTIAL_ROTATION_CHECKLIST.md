# Safe Credential Rotation Plan

## 1. Environment Variable Audit & Classification
The following environment variables were discovered in the codebase or infrastructure configurations:

| Variable Name | Classification |
| :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public / client-safe |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Public / client-safe |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Public / client-safe |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Public / client-safe |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Public / client-safe |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Public / client-safe |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public / client-safe |
| `NEXT_PUBLIC_API_BASE_URL` | Public / client-safe |
| `NEXT_PUBLIC_BACKEND_URL` | Public / client-safe |
| `NEXT_PUBLIC_APP_URL` | Public / client-safe |
| `API_BASE_URL` | Private server configuration |
| `FIREBASE_PRIVATE_KEY` / `SERVICE_ACCOUNT` | **Private server secret** (Backend) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Private server secret** (Backend) |
| `GROQ_API_KEY` | **Private server secret** (Backend) |
| `RAZORPAY_KEY_SECRET` | **Private server secret** (Backend) |

## 2. Git History & Current Repository Audit
- **Git History:** No accidentally committed `.env` files or secret keys were found in the git history.
- **Current Repository:** An untracked `.env.local` exists in the local workspace, and a `.env.local.example` is committed. No secret values (like `sk_...`) were found hardcoded in `src/`.

---

## 3. Credential Rotation Checklist

> **Note:** Only rotate backend service secrets (`Private server secrets`). The `NEXT_PUBLIC_` variables (like `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_RAZORPAY_KEY_ID`) act as public identifiers. They generally only need rotation if the underlying project is compromised or regenerated.

### [ ] Firebase (Admin Service Account)
- **Variable Name:** `FIREBASE_PRIVATE_KEY` / `FIREBASE_CLIENT_EMAIL` (or full JSON)
- **Service:** Backend (Java Spring Boot on Render)
- **Rotation Required:** Yes, if potentially exposed.
- **Dashboard Location:** Firebase Console -> Project Settings -> Service Accounts.
- **Update Location:** Render Dashboard -> Environment Variables.
- **Redeployment:** Restart the Java Spring Boot service on Render.
- **Verification Steps:**
  1. Trigger an auth-required endpoint (e.g., login or token validation).
  2. Verify the backend successfully validates the Firebase JWT using the new service account context.

### [ ] Supabase (Database / API)
- **Variable Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Service:** Backend (Java Spring Boot on Render)
- **Rotation Required:** Yes, if database access was exposed.
- **Dashboard Location:** Supabase Dashboard -> Project Settings -> API -> "Roll Secret".
- **Update Location:** Render Dashboard -> Environment Variables.
- **Redeployment:** Restart the Java Spring Boot service on Render.
- **Verification Steps:**
  1. Use the old `service_role` key via cURL to Supabase; verify it returns `401 Unauthorized`.
  2. Perform a database read/write action from the web app (e.g., fetch profile) to confirm the new key functions.

### [ ] Groq (AI Integration)
- **Variable Name:** `GROQ_API_KEY`
- **Service:** Backend (Java Spring Boot on Render)
- **Rotation Required:** Yes.
- **Dashboard Location:** Groq Console -> API Keys.
- **Update Location:** Render Dashboard -> Environment Variables.
- **Redeployment:** Restart the Java Spring Boot service on Render.
- **Verification Steps:**
  1. Delete the old key in the Groq console.
  2. Send a prompt via the Chat screen in the web app.
  3. Ensure a valid AI response is streamed back without a `401/403` error.

### [ ] Razorpay (Payments)
- **Variable Name:** `RAZORPAY_KEY_SECRET`
- **Service:** Backend (Java Spring Boot on Render)
- **Rotation Required:** Yes, critical for financial security.
- **Dashboard Location:** Razorpay Dashboard -> Settings -> API Keys -> "Regenerate Key".
- **Update Location:** Render Dashboard -> Environment Variables.
- **Redeployment:** Restart the Java Spring Boot service on Render.
- **Verification Steps:**
  1. Attempt to generate an order hash using the old secret; verify it fails verification.
  2. Complete a test transaction (using test mode credentials first) to ensure the webhook signature validates correctly with the new secret.

### [ ] Vercel / Render API Tokens (Infrastructure)
- **Variable Name:** CI/CD deployment tokens (if applicable).
- **Service:** GitHub Actions or Local CLI.
- **Rotation Required:** Only if automated deployment tokens were exposed.
- **Dashboard Location:** Vercel (Account Settings -> Tokens) / Render (Account Settings -> API Keys).
- **Update Location:** GitHub Repository Secrets (if using CI/CD).
- **Verification Steps:** Push a test commit and verify the CI/CD pipeline triggers a successful build/deployment.
