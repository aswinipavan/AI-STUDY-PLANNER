# Production Audit Findings - Critical Issues Identified

**Date:** August 14, 2026  
**Status:** Issues Identified - Fixes Required

---

## CRITICAL ISSUES FOUND

### Issue 1: Timetable Generation 500 Error ❌ CRITICAL

**Symptom:** POST `/api/timetable/generate` returns HTTP 500  
**Root Cause:** **Complete DTO mismatch between frontend and backend**

**Frontend sends:**
```typescript
{
  subjectIds: string[],
  availableHoursPerDay: number,
  style: 'intense' | 'balanced' | 'relaxed',
  startDate: string,
  durationDays: number,
  useDeadlines: boolean,
  targetDeadlineDate?: string
}
```

**Backend expects:**
```java
{
  weekStartDate: LocalDate,
  title: String,
  slots: List<SlotRequest>  // Pre-formed slots!
}
```

**Analysis:**
- The frontend sends high-level generation **parameters**
- The backend expects fully-formed timetable **slots**
- The backend `generateAiTimetable` method internally generates slots from subjects
- But the DTO validation fails before it reaches that logic
- `@NotEmpty List<SlotRequest> slots` constraint fails because frontend doesn't send slots
- This causes 400 or 500 depending on how validation failure is handled

**Fix Required:**
Create a new `GenerateTimetableRequest` DTO that matches frontend payload:
```java
public class GenerateTimetableRequest {
    @NotEmpty List<UUID> subjectIds;
    @DecimalMin("0.5") BigDecimal availableHoursPerDay;
    String style;  // 'intense', 'balanced', 'relaxed'
    @NotNull LocalDate startDate;
    @Min(1) Integer durationDays;
    Boolean useDeadlines;
    LocalDate targetDeadlineDate;
}
```

Update `TimetableController.generateAiTimetable` to accept `GenerateTimetableRequest` instead of `TimetableRequest`.

---

### Issue 2: Timetable Active 404 Error ❌ CRITICAL

**Symptom:** GET `/api/timetable/active` returns HTTP 404  
**Root Cause:** **Endpoint exists in backend, 404 likely due to:**

**Possible Causes:**
1. **Authentication issue** - Token not being sent or invalid
2. **Backend not deployed with latest code** - Old version without `/active` endpoint
3. **Proxy routing issue** - Vercel proxy not forwarding correctly
4. **CORS pre-flight failure** - OPTIONS request failing

**Backend Verification:**
- ✅ Endpoint EXISTS in `TimetableController.java` line 56
- ✅ Mapped to `@GetMapping("/active")`
- ✅ Returns `TimetableResponse` wrapped in `ApiResponse`
- ✅ Requires authentication via `@PreAuthorize("isAuthenticated()")`

**Most Likely:** Authentication token not being sent properly OR backend not updated with latest code.

**Fix Required:**
1. Verify latest backend code is deployed to Render
2. Check if authentication token is sent in request headers
3. Test endpoint directly with valid token

---

### Issue 3: Exam Creation 500 Error ❌ CRITICAL

**Symptom:** POST `/api/exams/` returns HTTP 500  
**Root Cause:** **Likely validation or null pointer exception**

**Analysis of ExamService.createExam:**
```java
Subject subject = subjectRepository.findById(request.getSubjectId())
    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

if (!subject.getStudent().getId().equals(studentId)) {
    throw new IllegalArgumentException("Subject does not belong to student");
}
```

**Potential Issues:**
1. `request.getSubjectId()` is null - frontend not sending subjectId properly
2. Subject exists but `subject.getStudent()` is null - lazy loading issue
3. `examDate` validation fails - date format mismatch
4. `durationHours` validation fails - expecting BigDecimal, receiving something else

**Frontend Payload:**
```typescript
{
  subjectId: data.subjectId,
  examName: data.examName,
  examDate: data.examDate,  // Format: YYYY-MM-DD
  examType: data.examType,
  durationHours: data.durationHours,
  syllabusCovered: data.syllabusCovered
}
```

**Backend DTO:**
```java
@NotNull UUID subjectId;
@NotBlank String examName;
@NotNull LocalDate examDate;
String examType;
@DecimalMin("0.5") BigDecimal durationHours;
String syllabusCovered;
```

**Most Likely Issues:**
- `durationHours` being sent as number instead of string (JSON number → BigDecimal conversion)
- `subjectId` being sent as string but not UUID format
- `examDate` being sent as string but not parseable to LocalDate

**Fix Required:**
1. Check frontend ExamModal form - verify all fields are sent correctly
2. Add proper error handling in ExamService
3. Log validation errors properly
4. Test with exact payload frontend sends

---

### Issue 4: AI Chat "Unable to Generate Response" ⚠️ HIGH PRIORITY

**Symptom:** AI chat returns: "I'm currently unable to generate a response. Please try again later."  
**Root Cause:** **GroqService catches ALL exceptions and returns fallback message**

**Analysis:**
```java
private String callGroq(String prompt) {
    try {
        // ... API call logic
    } catch (Exception e) {
        log.error("Groq API call failed. Error: {}", e.getMessage(), e);
        return "I'm currently unable to generate a response. Please try again later.";
    }
}
```

**Potential Root Causes:**
1. **Groq API key invalid** - GROQ_API_KEY environment variable on Render is wrong/expired
2. **API URL incorrect** - Using wrong endpoint (Gemini API URL instead of Groq)
3. **Request format wrong** - API expects different JSON structure
4. **Rate limiting** - Hit rate limit (30 requests/minute configured)
5. **Network timeout** - Groq API slow/unreachable from Render
6. **JSON parsing failure** - Response structure doesn't match expected format

**Backend Code Issue:**
The `callGroq` method builds a Gemini API request structure:
```java
Map<String, Object> part = new HashMap<>();
part.put("text", prompt);

Map<String, Object> content = new HashMap<>();
content.put("role", "user");
content.put("parts", List.of(part));

body.put("contents", List.of(content));
```

**But GroqConfig.GROQ_API_URL might be Groq's endpoint, which expects different format!**

**Check GroqConfig:**
```java
public static final String GROQ_API_URL = ...
```

**If this is Groq API:** The request format is WRONG. Groq uses:
```json
{
  "model": "mixtral-8x7b-32768",
  "messages": [{"role": "user", "content": "..."}],
  "temperature": 0.7
}
```

**Not Gemini's format:**
```json
{
  "contents": [{"role": "user", "parts": [{"text": "..."}]}],
  "generationConfig": {...}
}
```

**Fix Required:**
1. Check `GroqConfig.GROQ_API_URL` - is it Groq or Gemini?
2. If Groq: Fix request format to match Groq API
3. If Gemini: Fix API key parameter (should be in header, not query param)
4. Add better error logging - don't swallow exceptions
5. Return specific error messages for different failure types

---

### Issue 5: Timetable /active Response Structure ⚠️ MEDIUM

**Analysis:**
Frontend expects:
```typescript
const response = await apiClient.get('/api/timetable/active');
return response.data;
```

Backend returns:
```java
ApiResponse.success(response, "Active timetable fetched successfully")
```

Which wraps as:
```json
{
  "success": true,
  "message": "Active timetable fetched successfully",
  "data": { ...timetableResponse }
}
```

**Frontend needs to unwrap `response.data.data`** like other APIs do.

**Fix Required:**
Update `timetableApi.getActive` to unwrap properly:
```typescript
getActive: async (): Promise<Timetable> => {
  const response = await apiClient.get('/api/timetable/active');
  return response.data.data ?? response.data;
},
```

---

## ISSUES TO INVESTIGATE

### Subjects Feature ✅ (Likely Working)
- Endpoint returns HTTP 200 according to report
- Still needs end-to-end verification

### Dashboard Components ❓ (Unknown)
- Need to verify each widget individually
- Check API calls for stats, upcoming exams, etc.

### Materials Feature ❓ (Unknown)
- Need to verify upload, list, delete functionality
- Check Supabase signed URL generation

### Performance/Analytics ❓ (Unknown)
- Need to verify chart data loading
- Check calculations for subject-wise performance

### Profile/Settings ❓ (Unknown)
- Need to verify CRUD operations
- Check notification settings persistence

---

## SUMMARY

| Issue | Priority | Status | Fix Complexity |
|-------|----------|--------|----------------|
| Timetable Generate 500 | ❌ CRITICAL | DTO mismatch | HIGH - New DTO + Controller update |
| Timetable Active 404 | ❌ CRITICAL | Unknown | MEDIUM - Investigate deployment/auth |
| Exam Creation 500 | ❌ CRITICAL | Validation/mapping | MEDIUM - Field mapping fix |
| AI Chat Failure | ⚠️ HIGH | API format wrong | HIGH - Fix request format or API endpoint |
| Response Unwrapping | ⚠️ MEDIUM | Missing .data | LOW - Frontend fix |

---

## NEXT STEPS

1. **Fix DTO Mismatch** - Create GenerateTimetableRequest DTO
2. **Investigate Backend Deployment** - Check if latest code is on Render
3. **Fix AI API Call** - Verify Groq vs Gemini and fix request format
4. **Fix Exam Creation** - Investigate exact validation failure
5. **Test All Features End-to-End** - Verify each feature works in deployed app
6. **Deploy Fixes** - Push corrected code and verify in production

---

## FILES TO MODIFY

**Backend:**
1. `backend/src/main/java/com/aistudyplanner/model/dto/request/GenerateTimetableRequest.java` (NEW)
2. `backend/src/main/java/com/aistudyplanner/controller/TimetableController.java` (UPDATE)
3. `backend/src/main/java/com/aistudyplanner/service/TimetableService.java` (UPDATE signature)
4. `backend/src/main/java/com/aistudyplanner/service/GroqService.java` (FIX API call)
5. `backend/src/main/java/com/aistudyplanner/config/GroqConfig.java` (VERIFY URL)

**Frontend:**
1. `frontend/src/api/timetable.api.ts` (FIX response unwrapping)
2. Potentially `frontend/src/components/exams/ExamModal.tsx` (VERIFY field mappings)

**Tests:**
- Run backend tests after DTO changes
- Run frontend TypeScript check
- Manual testing in deployed application

---

## ESTIMATED FIX TIME

- DTO Mismatch: 30 minutes (create DTO, update controller, update service)
- AI API Fix: 20 minutes (fix request format)
- Response Unwrapping: 5 minutes
- Testing: 30 minutes
- Deployment: 10 minutes
- Production Verification: 20 minutes

**Total:** ~2 hours for complete fix and verification
