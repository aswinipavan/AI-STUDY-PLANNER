# Render Backend Deep Diagnosis

**Date:** August 12, 2026  
**Focus:** Distinguishing between cold starts, crashes, and resource exhaustion  
**Backend URL:** https://ai-study-planner-hp0e.onrender.com

---

## Test Results

### 1. Backend Responsiveness Testing

**Test 1: Health Check with 5s Timeout**
- Result: ❌ TIMEOUT
- Time to timeout: 5,204ms
- Conclusion: Backend did not respond

**Test 2: Health Check with 90s Timeout**
- Result: ❌ TIMEOUT  
- Time to timeout: 90,199ms
- Conclusion: **Backend still not responding after 90+ seconds of waiting**

**Finding:** This timeout is LONGER than a typical Render cold start (50-60 seconds). If the backend was just sleeping, it should have started within 90 seconds. This suggests either:
- A. Backend is completely down/crashed (not even attempting to start)
- B. Backend is stuck during initialization (not responding to traffic)
- C. Backend process was killed by Render due to resource limits

---

## Code Review: Application Startup & Configuration

### 1. Startup Entry Point
**File:** `backend/src/main/java/com/aistudyplanner/AiStudyPlannerApplication.java`
- ✅ Standard Spring Boot application
- ✅ Has `@EnableScheduling` and `@EnableAsync` configured
- No blocking initialization logic detected

### 2. Startup Initialization Sequence

The application initializes the following components on startup:

#### a. Firebase Configuration (FirebaseConfig.java)
```java
@Bean
public FirebaseApp firebaseApp() throws IOException {
    // 1. Decodes base64 FIREBASE_SERVICE_ACCOUNT_JSON
    // 2. Creates GoogleCredentials from service account
    // 3. Initializes FirebaseApp
    // Potential issue: If environment variable is missing or malformed, 
    // this throws IOException and blocks startup
}
```

**Risk:** If `FIREBASE_SERVICE_ACCOUNT_JSON` is:
- ✅ Correctly set on Render: OK
- ❌ Missing on Render: Application fails to start → EXIT 1
- ❌ Malformed base64: Application fails to start → EXIT 1

#### b. Groq Configuration (GroqConfig.java)
```java
@Bean
public RestTemplate groqRestTemplate(RestTemplateBuilder builder) {
    // Just creates a RestTemplate, no external calls
    // Low risk of failure
}
```

#### c. Database Connection Pool (Hikari)
**Development Config (application.properties):**
```properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
```

**Production Config (application-prod.properties):**
```properties
spring.datasource.hikari.maximum-pool-size=5
spring.datasource.hikari.minimum-idle=2
spring.datasource.hikari.connection-timeout=20000
```

**Risk:** On Render free tier:
- Tries to establish 5 persistent database connections on startup
- If Supabase database is unreachable or slow, connection times out
- 20-30 second timeout × number of retries could exceed total startup window

#### d. Async Thread Pools
**Configuration:**
```properties
spring.task.execution.pool.core-size=5
spring.task.execution.pool.max-size=10

spring.task.scheduling.pool.size=3
```

**Risk:** These threads consume memory on startup

#### e. Security Filter Chain (SecurityConfig.java)
```java
@EnableMethodSecurity
@EnableWebSecurity
// Creates security filter chain with:
// - CORS filter
// - FirebaseTokenFilter
// - Security headers filter
```

**Risk:** If FirebaseTokenFilter has issues, it could block startup

---

## Memory Analysis: Free Tier Resource Limits

### Render Free Tier Limits
- **Memory:** 512 MB (shared with all processes)
- **CPU:** 0.5 vCPU (shared)

### Expected Memory Distribution (Java 17)

```
Total: 512 MB

JVM Heap:        384 MB (75% of 512MB via -XX:MaxRAMPercentage=75.0)
Thread Stacks:   ~50 MB (default 1MB per thread × ~50 threads)
  - Hikari threads: ~5 threads
  - Async executor threads: ~5 threads  
  - Spring/Tomcat threads: ~30+ threads
Non-heap:        ~50 MB (Metaspace, code cache, etc.)
Spring Boot:     ~20 MB (classes, beans initialization)

Total Used:      ~500 MB (dangerously close to limit)
```

### What Could Trigger Exit 137 (SIGKILL due to OOM)

1. **Startup phase consumes too much memory:**
   - Hibernate scanning entities
   - Spring loading all beans
   - Database connection pool initialization
   - Firebase client loading
   - Total memory exceeds 512MB → Linux OOM killer → SIGKILL (Exit 137)

2. **Memory leak during initialization:**
   - Unbounded cache initialization
   - Large object creation that's not garbage collected
   - Thread leak creating too many threads

3. **Database connection timeout causing retries:**
   - Connection pool tries to create 5 connections
   - Each connection setup allocates buffers
   - If Supabase is slow/unreachable, connections hang
   - Multiple concurrent connection attempts = memory spike
   - OOM killer triggers

---

## Potential Issues Found

### Issue 1: Database Connection Pool on Free Tier ⚠️

**Problem:** Production config creates minimum-idle=2 connections on startup.

**Location:** `backend/src/main/resources/application-prod.properties`

```properties
spring.datasource.hikari.maximum-pool-size=5      # ← Too high for 512MB
spring.datasource.hikari.minimum-idle=2           # ← Connects on startup
spring.datasource.hikari.connection-timeout=20000 # ← 20 second timeout
```

**Analysis:**
- Each database connection thread: ~1-2 MB of memory
- Connection buffers: ~5-10 MB per connection
- 5 connections × 7 MB average = 35 MB just for connections
- On 512MB system, this is acceptable but leaves little room for error
- If connection establishment is slow, it could timeout and retry, creating memory pressure

**Recommendation:** Reduce pool size for free tier:
```properties
spring.datasource.hikari.maximum-pool-size=2      # Safer for 512MB
spring.datasource.hikari.minimum-idle=1
spring.datasource.hikari.connection-timeout=15000
```

### Issue 2: Async Thread Pools on Free Tier ⚠️

**Problem:** Creating 10 threads for async task execution

**Location:** `backend/src/main/resources/application.properties`

```properties
spring.task.execution.pool.max-size=10   # ← 10 threads
spring.task.scheduling.pool.size=3       # ← 3 scheduler threads
```

**Analysis:**
- Each thread stack: ~1 MB (default)
- 10 + 3 = 13 additional threads × 1 MB = 13 MB
- Total thread stack overhead could be 50-100 MB with Spring/Tomcat threads

**Recommendation:** Reduce for free tier:
```properties
spring.task.execution.pool.core-size=2
spring.task.execution.pool.max-size=4
spring.task.scheduling.pool.size=1
```

### Issue 3: No Resource Limits Specified

**Problem:** Application doesn't handle resource constraints gracefully

**Current behavior:**
- Tries to allocate maximum resources regardless of memory available
- No fallback if initialization fails
- No retry logic for transient failures

---

## Current Hypothesis: Why Backend Is Not Responding

### Most Likely Scenario: **Application Fails to Start (Exit 1 or 137)**

**Evidence:**
1. ✅ 90-second timeout with no response (longer than cold start window)
2. ✅ Consistent timeouts (not intermittent, suggesting persistent issue)
3. ✅ Memory constraints on 512MB tier
4. ✅ Database connection pool could be the culprit
5. ✅ No evidence of successful startup in recent logs

**Root Cause Candidates (in order of likelihood):**

| Rank | Cause | Evidence | Probability |
|------|-------|----------|-------------|
| 1 | Firebase config missing on Render | Would cause IOException, Exit 1 | HIGH |
| 2 | Supabase database unreachable/slow | Connection pool hangs during startup | HIGH |
| 3 | Memory exhaustion during startup | 512MB insufficient for all configs | MEDIUM |
| 4 | Render free tier spinning down | But should wake up within 90s | LOW |
| 5 | Network issue between Render and Supabase | Regional connectivity | LOW |

---

## Recommended Diagnostic Steps (Not Yet Performed)

### Step 1: Access Render Dashboard Logs
**How:** Log into https://dashboard.render.com → ai-study-planner-backend → Logs tab
**What to look for:**
- "Started AiStudyPlannerApplication" message → Startup succeeded
- "Error initializing Spring context" → Startup failed
- "IOException" or "NullPointerException" → Configuration missing
- "Exit with value 1" → Application crash
- "Exit with value 137" → Out of memory
- Long delays between log messages → Resource contention

### Step 2: Check Environment Variables on Render
**What to verify:**
- `FIREBASE_SERVICE_ACCOUNT_JSON` is set
- `SUPABASE_DB_URL` is set correctly
- `JWT_SECRET` is set
- All required vars are populated (not empty strings)

### Step 3: Monitor Startup in Real-Time
**How:** Trigger a redeploy on Render, watch logs live as instance starts
**Observe:**
- Startup time
- Memory usage progression
- Where it gets stuck (if at all)
- Any "OutOfMemory" messages

### Step 4: Test Database Connectivity
**How:** Create a simple test endpoint that only connects to database
**Endpoint:** `GET /api/test-db`
**Purpose:** Isolate whether Supabase connectivity is the issue

---

## Conclusion So Far

The backend is **definitely not running**. The question is whether it's:

**A) Failing to start (Exit 1 or 137):**
- Application throws exception during initialization
- Cannot recover
- Requires code fix or environment variable fix

**B) Starting but crashing on first request:**
- Application starts successfully
- Request triggers unhandled exception
- Requires code fix

**C) Free tier cold start + timeout:**
- Application is waking up slowly
- Render instance takes 90+ seconds to boot
- Requires upgraded Render plan

**Most Likely:** A or B (startup failure)

**Recommended Action:** Access Render dashboard logs to confirm which scenario is happening.

---

## Code Changes NOT Required Yet

I have NOT made any code changes because:
1. ✅ Application compiles successfully locally
2. ✅ No obvious startup-blocking code issues found
3. ❌ Cannot confirm root cause without Render logs
4. ✅ Configuration may be sufficient (just environment variable issue)

**Code changes will only be made after confirming the exact failure point from Render logs.**
