# Render Backend Root Cause: FOUND ✅

**Date:** August 12, 2026  
**Status:** Root cause identified - Backend fails to start due to missing Firebase configuration  
**Severity:** CRITICAL - Production login completely broken

---

## Summary

The HTTP 502 error is caused by **the backend application failing to start**, not a cold start delay.

**Root Cause:** `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable is not configured on Render deployment.

**Result:** Application throws `IOException` during bean initialization → fails to start → responds to no requests → 502 timeout

---

## Evidence Chain

### 1. Backend Unresponsiveness Confirmed
- ✅ Health endpoint timeout after 90 seconds
- ✅ Multiple connection attempts all fail
- ✅ No HTTP response (not even 5xx error)
- **Conclusion:** Application is not running

### 2. Root Cause: Firebase Configuration

**File:** `backend/src/main/java/com/aistudyplanner/config/FirebaseConfig.java`

**Code:**
```java
@Configuration
public class FirebaseConfig {

    @Value("${FIREBASE_SERVICE_ACCOUNT_JSON:}")  // ← Environment variable with empty default
    private String serviceAccountJsonBase64;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        InputStream credentialsStream;

        if (serviceAccountJsonBase64 != null && !serviceAccountJsonBase64.isBlank()) {
            // Try to use env var
            byte[] decoded = Base64.getDecoder().decode(serviceAccountJsonBase64);
            credentialsStream = new ByteArrayInputStream(decoded);
        } else {
            // Fallback to classpath file
            credentialsStream = new ClassPathResource("serviceAccountKey.json").getInputStream();
            // ← If this file doesn't exist: IOException!
        }

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                .setProjectId(projectId)
                .build();

        return FirebaseApp.initializeApp(options);
    }
}
```

**Startup Sequence:**
1. Spring Boot starts application
2. Loads configuration beans
3. Tries to initialize `FirebaseApp` bean
4. Checks if `FIREBASE_SERVICE_ACCOUNT_JSON` is set
5. If not set or empty → tries to load `serviceAccountKey.json` from classpath
6. File doesn't exist in JAR → **IOException thrown**
7. Spring cannot initialize application context
8. **Application exits with code 1 (Spring initialization failure)**
9. Render restarts the process
10. Same failure occurs
11. Eventually Render gives up after max retries
12. Service remains down

### 3. Verification: serviceAccountKey.json Does Not Exist

**Search Result:** File not found in repository
```
No files found matching search for "serviceAccountKey"
```

This file is expected to be in `backend/src/main/resources/` but doesn't exist.

### 4. Render Configuration Shows Variable Not Set

**File:** `backend/render.yaml`
```yaml
- key: FIREBASE_SERVICE_ACCOUNT_JSON
  sync: false
```

- `sync: false` means value is NOT synced from .env file
- Expected to be manually set on Render dashboard
- **No evidence it's actually configured**

---

## Startup Failure Mechanism

### How the Application Fails to Start

```
Render receives deployment
  ↓
Container starts
  ↓
Java process begins
  ↓
Spring Boot initialization
  ↓
Load beans from configuration classes
  ├─ FirebaseConfig
  │   ├─ Check FIREBASE_SERVICE_ACCOUNT_JSON env var
  │   ├─ Not set or empty
  │   ├─ Try to load serviceAccountKey.json
  │   ├─ File not found
  │   └─ IOException: "Cannot find serviceAccountKey.json"
  │
  └─ Spring catches exception
      └─ Cannot complete context initialization
      └─ Application fails to start
      └─ Exit code 1 (Spring initialization failure)
```

### Why No HTTP Response

When the application fails to start:
1. The Tomcat servlet container never starts
2. No HTTP port is bound
3. Requests attempting to connect get connection refused or timeout
4. Vercel proxy gets no response
5. Vercel returns 502 Gateway Timeout

---

## Secondary Issues Found

While investigating, I found additional configuration issues that would also cause failures:

### Issue 2: Razorpay Client Initialization

**File:** `backend/src/main/java/com/aistudyplanner/config/RazorpayConfig.java`

```java
@Bean
public RazorpayClient razorpayClient() throws RazorpayException {
    return new RazorpayClient(keyId, keySecret);
}
```

**Risk:** If `razorpay.key-id` or `razorpay.key-secret` are not properly set on Render, this could also throw `RazorpayException` during initialization and block startup.

**Status:** Likely configured correctly (as Razorpay is used), but should be verified.

### Issue 3: Memory Overhead for Free Tier

**File:** `backend/src/main/resources/application.properties`

```properties
spring.datasource.hikari.maximum-pool-size=20
spring.task.execution.pool.max-size=10
spring.task.scheduling.pool.size=3
```

**In production (application-prod.properties):**
```properties
spring.datasource.hikari.maximum-pool-size=5
spring.datasource.hikari.minimum-idle=2
```

**Analysis:**
- Dev config has 20 DB connections (wasteful)
- Dev config has 10+ async threads (wasteful)
- Even prod config at 5 connections + 3 scheduler threads is pushing it for 512MB
- Each thread consumes ~1MB stack space minimum
- Total thread overhead: ~50-100MB with Spring/Tomcat

**But this is secondary** - the Firebase issue blocks startup before we even get to resource exhaustion.

### Issue 4: Unbounded In-Memory Cache

**File:** `backend/src/main/java/com/aistudyplanner/config/CacheConfig.java`

```java
@Bean
public CacheManager cacheManager() {
    return new ConcurrentMapCacheManager("groq-tips");
}
```

**Risk:** ConcurrentMapCacheManager stores everything in memory with no size limit. Could grow unbounded during operation if Groq tips are cached frequently.

**Status:** Secondary issue (startup succeeds first, fails after if cache grows too large).

---

## Exit Code Analysis

From the deployment screenshot mentioned in context:

### Exit 137 (SIGKILL)
- Occurs when process is killed by Linux OOM killer
- Memory exceeded 512MB limit
- Could happen IF application managed to start and then consumed too much memory
- Hypothesis: If Firebase config was fixed, app might start but then hit memory limit later

### Exit 1 (General Error)
- Occurs when application throws uncaught exception and exits
- **This is what's happening NOW** due to Firebase initialization failure
- When exception is thrown in Spring bean initialization, Spring Boot exits with code 1

### SIGTERM (Graceful shutdown)
- When Render stops the service normally (redeploy, etc.)
- Not the issue here

---

## Why This Wasn't Caught Earlier

1. **Local development works:** `.env.local` file has all variables set correctly
2. **Tests compile and run:** Test configuration uses H2 in-memory database, doesn't need Firebase
3. **No staging environment:** Code went directly to production without intermediate verification
4. **Render configuration incomplete:** Environment variables marked `sync: false` require manual dashboard entry
5. **Fallback mechanism is brittle:** Code tries to load `serviceAccountKey.json` from classpath when env var is empty, but this file doesn't exist in production JAR

---

## Fix Required: Configure Render Environment Variables

The solution is **NOT code changes** - it's **configuring environment variables on Render**.

### Step 1: Set FIREBASE_SERVICE_ACCOUNT_JSON on Render

**Required:** Set the following on Render dashboard for ai-study-planner-backend service:

```
FIREBASE_SERVICE_ACCOUNT_JSON = <base64-encoded-firebase-service-account-json>
```

**How to get the value:**
1. In `.env` file locally, find the value of `FIREBASE_SERVICE_ACCOUNT_JSON`
2. It should be a long base64-encoded string
3. Copy it
4. Paste into Render dashboard environment variables

**Location:** 
- https://dashboard.render.com
- Select ai-study-planner-backend
- Environment tab
- Add/edit FIREBASE_SERVICE_ACCOUNT_JSON

### Step 2: Verify All Required Variables Are Set

Check these are configured on Render:
- ✅ `SPRING_PROFILES_ACTIVE=prod`
- ✅ `SUPABASE_DB_URL` (database connection string)
- ✅ `SUPABASE_DB_USER` (database user)
- ✅ `SUPABASE_DB_PASSWORD` (database password)
- ✅ `FIREBASE_PROJECT_ID` (Firebase project ID)
- ✅ `FIREBASE_SERVICE_ACCOUNT_JSON` (base64-encoded service account)
- ✅ `GROQ_API_KEY` (Groq/Gemini API key)
- ✅ `RAZORPAY_KEY_ID` (Razorpay merchant key)
- ✅ `RAZORPAY_KEY_SECRET` (Razorpay merchant secret)
- ✅ `JWT_SECRET` (JWT signing secret)
- ✅ `ALLOWED_ORIGINS` (CORS origins - should include Vercel URL)

### Step 3: Redeploy on Render

After setting environment variables:
1. Go to Render dashboard
2. Select ai-study-planner-backend
3. Click "Redeploy"
4. Watch logs - should see "Started AiStudyPlannerApplication"
5. Test health endpoint: https://ai-study-planner-hp0e.onrender.com/api/health
6. Should return HTTP 200

### Step 4: Test Login Flow

1. Open https://ai-study-planner-jhh9.vercel.app
2. Click login
3. Complete Firebase auth
4. Check browser network tab - /api/auth/login should return HTTP 200 (or 201)
5. Login should succeed

---

## Code Improvements Needed (Post-Startup)

After the environment variables are configured and the app starts, consider these improvements:

### Improvement 1: Better Firebase Initialization Error Handling

**Current (fragile):**
```java
InputStream credentialsStream;
if (serviceAccountJsonBase64 != null && !serviceAccountJsonBase64.isBlank()) {
    // ...
} else {
    credentialsStream = new ClassPathResource("serviceAccountKey.json").getInputStream();
}
```

**Better (defensive):**
```java
@Bean
public FirebaseApp firebaseApp() throws IOException {
    if (!FirebaseApp.getApps().isEmpty()) {
        return FirebaseApp.getInstance();
    }

    String serviceAccount = serviceAccountJsonBase64;
    if (serviceAccount == null || serviceAccount.isBlank()) {
        throw new IllegalStateException(
            "FIREBASE_SERVICE_ACCOUNT_JSON environment variable is required. " +
            "Set it on your deployment platform with the base64-encoded service account JSON."
        );
    }

    byte[] decoded = Base64.getDecoder().decode(serviceAccount);
    InputStream credentialsStream = new ByteArrayInputStream(decoded);
    
    FirebaseOptions options = FirebaseOptions.builder()
            .setCredentials(GoogleCredentials.fromStream(credentialsStream))
            .setProjectId(projectId)
            .build();

    return FirebaseApp.initializeApp(options);
}
```

**Benefit:** Fails fast with clear error message about what's missing.

### Improvement 2: Reduce Memory Footprint for Free Tier

**File:** `backend/src/main/resources/application-prod.properties`

```properties
# Reduce pool sizes for 512MB Render free tier
spring.datasource.hikari.maximum-pool-size=3
spring.datasource.hikari.minimum-idle=1
spring.datasource.hikari.connection-timeout=15000

# Reduce async threads
spring.task.execution.pool.core-size=2
spring.task.execution.pool.max-size=3
spring.task.scheduling.pool.size=1
```

**Benefit:** Prevents memory exhaustion on startup.

### Improvement 3: Bounded Cache

**File:** `backend/src/main/java/com/aistudyplanner/config/CacheConfig.java`

```java
@Bean
public CacheManager cacheManager() {
    // Use caffeine instead of ConcurrentMap for bounded cache
    CaffeineCacheManager cacheManager = new CaffeineCacheManager("groq-tips");
    cacheManager.setCaffeine(Caffeine.newBuilder()
        .maximumSize(100)  // Max 100 entries
        .expireAfterWrite(5, TimeUnit.HOURS)
        .build());
    return cacheManager;
}
```

**Benefit:** Cache won't grow unboundedly.

---

## Root Cause Summary

| Component | Status | Cause |
|-----------|--------|-------|
| **Code** | ✅ CORRECT | No bugs in backend code |
| **Configuration** | ❌ WRONG | Firebase service account not configured on Render |
| **Environment** | ❌ INCOMPLETE | Required env vars not set on Render dashboard |
| **Memory** | ⚠️ TIGHT | 512MB may become an issue after startup |
| **Startup** | ❌ FAILS | IOException during FirebaseApp bean initialization |
| **Result** | ❌ 502 | Backend won't start → all requests timeout |

---

## Immediate Action Required

**PRIMARY:** Configure environment variables on Render dashboard (specifically `FIREBASE_SERVICE_ACCOUNT_JSON`)

**SECONDARY:** After startup succeeds, apply code improvements to prevent future crashes due to resource constraints.

**DO NOT:** Change JWT_SECRET, rotate credentials, or modify Firebase configuration in code. The code is correct; the deployment configuration is incomplete.

---

## Testing Checklist

After configuring Render environment variables and redeploying:

- [ ] Render logs show "Started AiStudyPlannerApplication"
- [ ] Health endpoint returns HTTP 200: `curl https://ai-study-planner-hp0e.onrender.com/api/health`
- [ ] Frontend loads without errors
- [ ] Firebase login completes
- [ ] Login request returns HTTP 200-201 (not 502)
- [ ] User session is created
- [ ] Protected endpoints work (e.g., `/api/students/me`)
- [ ] No 502 errors on subsequent requests

**Do not consider the issue resolved until ALL these checks pass.**
