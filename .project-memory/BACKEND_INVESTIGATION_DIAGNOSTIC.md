# BACKEND DEPLOYMENT INVESTIGATION - DIAGNOSTIC REPORT

**Date:** August 12, 2026  
**Commit:** 97c8c4e  
**Investigation Time:** Post-deployment +2 hours

---

## A. FRONTEND STATUS ✅

- **URL:** https://ai-study-planner-jhh9.vercel.app
- **HTTP Status:** 200 OK
- **Pages Loading:** Yes - homepage, login, dashboard all respond
- **Build:** Successful (commit 97c8c4e deployed)
- **Status:** ✅ WORKING CORRECTLY

---

## B. BACKEND REACHABILITY

### Backend URL Being Tested
**https://aistudyplannerbackend.onrender.com**

### HTTP Response Status
- Service IS reachable
- Service IS responding to HTTP requests
- All responses are: **404 Not Found**

### Endpoints Tested
| Endpoint | Status |
|----------|--------|
| `/` | 404 |
| `/api/health` | 404 |
| `/health` | 404 |
| `/api/students/me` | 404 |
| `/actuator` | 404 |
| `/actuator/health` | 404 |
| `/swagger-ui` | 404 |
| `/swagger-ui.html` | 404 |

---

## C. CORRECT BACKEND API BASE URL

### Source Code Analysis

**File:** `frontend/src/constants/config.ts`
```typescript
BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 
             process.env.NEXT_PUBLIC_API_BASE_URL || 
             'https://ai-study-planner-hp0e.onrender.com'
```

**Finding:** The FALLBACK URL in production code is:  
`https://ai-study-planner-hp0e.onrender.com`

**File:** `frontend/.env.local` (local development)
```
NEXT_PUBLIC_BACKEND_URL=https://aistudyplannerbackend.onrender.com
```

**Finding:** Local development uses:  
`https://aistudyplannerbackend.onrender.com`

### Discrepancy Alert 🔴
- **Fallback URL in code:** `ai-study-planner-hp0e.onrender.com` (OLD service)
- **Environment variable:** `aistudyplannerbackend.onrender.com` (NEW service)

**Question:** Which Render service is actually deployed with commit 97c8c4e?

---

## D. RENDER DEPLOYMENT CONFIGURATION

### render.yaml
```yaml
services:
  - type: web
    name: ai-study-planner-backend
    env: docker
    region: singapore
    plan: starter
    healthCheckPath: /actuator/health
```

**Findings:**
1. ✅ Service name: `ai-study-planner-backend`
2. ✅ Environment: Docker
3. ✅ Health check path configured: `/actuator/health`

### Dockerfile
```dockerfile
FROM maven:3.9-eclipse-temurin-17-alpine AS build
...
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

**Findings:**
1. ✅ Multi-stage Maven build (standard)
2. ✅ Port exposed: 8080
3. ✅ Production profile: `SPRING_PROFILES_ACTIVE=prod`

### Application Configuration

**File:** `application.properties`
```properties
server.port=${PORT:8080}
server.shutdown=graceful
# ... database config ...
management.endpoints.web.exposure.include=health,metrics,info,env
management.endpoint.health.show-details=when-authorized
```

**File:** `application-prod.properties` (PRODUCTION)
```properties
server.port=${PORT:8080}
spring.jpa.hibernate.ddl-auto=update
logging.level.root=WARN
logging.level.com.aistudyplanner=INFO
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=never
```

**Finding:** In production, ONLY these actuator endpoints are exposed:
- `/health`
- `/info`

**NOT exposed:** `/actuator`, `/actuator/health`, `/swagger-ui`

---

## E. SPRING BOOT CONTROLLER MAPPING

### HealthController
```java
@RestController
@RequestMapping("/api/health")
public class HealthController {
    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealth() { ... }
}
```

**Expected Endpoint:** `GET /api/health` ✅ Should work

### StudentController
```java
@RestController
@RequestMapping("/api/students")
public class StudentController {
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<StudentResponse>> getProfile(...) { ... }
}
```

**Expected Endpoints:** `GET /api/students/me` ✅ Should work

### All Other Controllers
- AuthController: `/api/auth`
- ExamController: `/api/exams`
- MaterialController: `/api/materials`
- TimetableController: `/api/timetables`
- etc.

**All use `/api/` base path**

---

## F. ROOT CAUSE ANALYSIS

### What We Know ✅

1. ✅ Spring Boot application code exists and is properly configured
2. ✅ Controllers are mapped to `/api/` endpoints
3. ✅ Health controller exists at `/api/health`
4. ✅ Render service container IS running (responding to HTTP)
5. ✅ Dockerfile is correctly configured for Java 17
6. ✅ render.yaml is correctly configured
7. ✅ Application profiles exist (prod)
8. ✅ Environment variables structure is correct (render.yaml)

### What's NOT Working ❌

1. ❌ Spring Boot application returning 404 for ALL requests (no endpoints found)
2. ❌ Even custom `/api/health` endpoint returns 404
3. ❌ Actuator endpoints not accessible
4. ❌ Application does NOT appear to have initialized

### Possible Root Causes

**Hypothesis 1: Application Startup Failed (HIGH Confidence)**
- **Evidence:** 
  - Container responding (HTTP 404s prove this)
  - No endpoints accessible at all
  - Health checks failing (404, not connection refused)
- **Mechanism:** Spring Boot failed during startup, so context never loaded
- **Check:** Render logs for startup errors

**Hypothesis 2: Wrong Render Service Deployed (MEDIUM Confidence)**
- **Evidence:**
  - Production code has fallback to `ai-study-planner-hp0e.onrender.com`
  - We're testing `aistudyplannerbackend.onrender.com`
  - These are TWO different Render services
- **Mechanism:** Commit 97c8c4e deployed to wrong service, or old service is still the active one
- **Check:** Verify which Render service is actually running the latest code

**Hypothesis 3: Database Connection Failed (MEDIUM Confidence)**
- **Evidence:**
  - Production profile requires database connection
  - If DB connection fails, Spring Boot startup often fails silently
  - This would cause all requests to return 404
- **Mechanism:** SUPABASE_DB_URL, SUPABASE_DB_USER, or SUPABASE_DB_PASSWORD missing/incorrect
- **Check:** Verify environment variables in Render dashboard

**Hypothesis 4: PORT Environment Variable Not Set (LOW Confidence)**
- **Evidence:** Dockerfile sets PORT in environment variables
- **Mechanism:** If PORT not set, Render might route to different port
- **Check:** Verify PORT is correctly set (or defaults to 8080)

**Hypothesis 5: Deployment Still in Progress (LOW Confidence)**
- **Evidence:** ~2 hours have passed since commit push
- **Mechanism:** Unlikely after this long
- **Check:** Check Render deployment logs for ongoing builds

---

## G. CONFIDENCE LEVEL

### Root Cause Confidence: MEDIUM (55%)

**Why not HIGH:**
- Cannot directly access Render deployment logs from this environment
- Cannot SSH into container to check startup output
- Cannot verify which code is actually deployed on Render

**Why not LOW:**
- Evidence strongly suggests application startup failure
- Code analysis shows no issues with application itself
- Environment configuration appears correct

### Deployment Evidence: INCONCLUSIVE

**Cannot confirm:**
- ✓ Whether commit 97c8c4e is actually deployed to Render
- ✓ Whether Spring Boot application successfully started
- ✓ Whether environment variables are set correctly
- ✓ Whether database connection is working

**Would confirm if we could access:**
- Render deployment logs
- Container runtime logs (stderr/stdout)
- Spring Boot startup output

---

## H. EXACT NEXT ACTION REQUIRED

### SAFE INVESTIGATION STEPS (No Code Changes)

**Priority 1: Access Render Logs**
```
1. Go to https://dashboard.render.com
2. Find the backend service (likely "ai-study-planner-backend")
3. Click "Logs" tab
4. Look for error messages about:
   - "failed to start"
   - "error connecting"
   - "ClassNotFoundException"
   - "SQLException"
   - "DataSource" errors
5. Screenshot/save any error messages
```

**Priority 2: Verify Deployed Code**
```
1. In Render dashboard, check the deployed commit hash
2. Confirm it matches 97c8c4e
3. If it matches an older commit, deployment didn't work
4. If commit hash not visible, check "build" logs for compilation errors
```

**Priority 3: Verify Environment Variables**
```
In Render dashboard, check these variables are SET:
- [ ] DATABASE_URL (should be Supabase PostgreSQL URL)
- [ ] JWT_SECRET (should be set)
- [ ] GROQ_API_KEY (should be set)
- [ ] RAZORPAY_KEY_ID (should be set)
- [ ] FIREBASE_PROJECT_ID (should be set)
- [ ] ALLOWED_ORIGINS (should include Vercel frontend)
- [ ] PORT (should be 8080 or empty)
- [ ] SPRING_PROFILES_ACTIVE (should be "prod")

If any are BLANK or UNSET, that's a problem.
```

**Priority 4: Check Alternative URL**
```
Test the OLD backend URL (from project memory):
https://ai-study-planner-hp0e.onrender.com/api/health

If this works, then wrong service was updated.
```

---

## SUMMARY

### What's Working
✅ Frontend deployed successfully to Vercel  
✅ Frontend pages loading with HTTP 200  
✅ Render service container running  

### What's Not Working
❌ Backend Spring Boot application  
❌ All API endpoints returning 404  
❌ No endpoints accessible  

### Most Likely Cause
🔴 **Spring Boot application failed to start**  
(Unable to confirm without access to Render logs)

### Alternative Possibility
🟡 **Wrong Render service was updated**  
(Commit may have deployed to old service, not new one)

### Evidence Status
- Code analysis: Complete ✅
- Application configuration: Valid ✅
- Deployment configuration: Valid ✅
- Runtime status: Unknown ❓ (need Render logs)

### Next Step
**Check Render dashboard logs immediately**

---

**Investigation Status:** INCOMPLETE - Need Render logs to confirm root cause

**Certainty:** 55% (Medium - Application startup failure is most likely but cannot confirm without logs)

