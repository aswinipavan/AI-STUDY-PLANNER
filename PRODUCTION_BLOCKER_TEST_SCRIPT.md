# PRODUCTION BLOCKER INVESTIGATION SCRIPT

## DEPLOYMENT VERIFICATION

### Check Vercel Deployment
1. Go to: https://vercel.com/dashboard
2. Find project: AI-Study-Planner
3. Latest deployment should show commit: `3af34de`
4. Status should be: **Ready** (green checkmark)
5. Copy production URL (should be similar to): `https://ai-study-planner-jhh9-j5sn6hhhh-aswinipavan.vercel.app`

### Check Render Backend Deployment
1. Go to: https://dashboard.render.com
2. Find service: ai-study-planner-backend
3. Latest deploy should show: **Live** status
4. Build logs should show: "BUILD SUCCESS"
5. Service URL: `https://ai-study-planner-hp0e.onrender.com`

---

## VERIFY RECENT FIXES (Issues 4 & 5)

### TEST: Issue 5 - Material Upload Fix

**Before Testing**: Open Browser DevTools → Network tab

1. Login to production: `https://ai-study-planner-jhh9-j5sn6hhhh-aswinipavan.vercel.app/login`
2. Navigate to: `/materials`
3. Select a subject from dropdown
4. Click or drag a PDF file to upload
5. **Watch Network tab for**:
   - `GET /api/materials/upload-url` → Should return 200 with `{success: true, data: {uploadUrl: "https://...", fileUrl: "..."}}`
   - `PUT https://[supabase-url]/storage/v1/object/materials/[student-id]/[timestamp]_[filename].pdf` → Should return 200
   - `POST /api/materials/` → Should return 201
6. **Expected Result**: File appears in materials list
7. **Refresh page**: File should still be there

**✅ SUCCESS CRITERIA**:
- No `PUT /undefined → 404` error
- Valid Supabase storage URL in PUT request
- File visible in UI after upload
- File persists after refresh

**❌ FAILURE INDICATORS**:
- Still seeing `PUT /undefined → 404`
- uploadUrl is undefined or null in response
- File doesn't appear in list

---

### TEST: Issue 4 - Chat Sessions Fix

**Before Testing**: Open Browser DevTools → Network tab → Filter by "sessions"

1. Navigate to: `/chat`
2. Type message: "Help me prepare for my calculus exam"
3. Press Send
4. Wait for AI response
5. **Watch Network tab for**:
   - `POST /api/ai/chat` → Should return 201 with sessionId
   - `GET /api/ai/chat/sessions` → Should return 200 with array of sessions
6. **Check UI**: Recent Sessions sidebar (left side) should show new session with title "Help me prepare for my calculus exam"
7. Navigate to `/dashboard` then back to `/chat`
8. **Expected Result**: Session still appears in Recent Sessions

**✅ SUCCESS CRITERIA**:
- GET /api/ai/chat/sessions returns non-empty array
- Session appears in Recent Sessions sidebar
- Session has proper title and timestamp
- Session persists after navigation

**❌ FAILURE INDICATORS**:
- Recent Sessions still shows "No history yet"
- GET /api/ai/chat/sessions returns empty array
- Session disappears after navigation

---

## INVESTIGATE BLOCKER #1: Issue 6 - Exam Creation 500

### Step 1: Reproduce the Error

**Before Testing**: Open Browser DevTools → Network tab → Filter by "exams"

1. Navigate to: `/exams`
2. Click "Add Exam" button
3. Fill form:
   - **Subject**: Select any subject (e.g., "Mathematics")
   - **Exam Name**: "Final Exam"
   - **Exam Date**: Select date 7 days from today
   - **Difficulty**: Select "medium"
   - **Notes**: "Chapters 1-5"
4. Click "Add Exam"
5. **Watch Network tab for**:
   - `POST /api/exams/` request

### Step 2: Capture Error Details

**In Network Tab**:
1. Click on the failed `POST /api/exams/` request
2. Go to **Response** tab
3. Copy the ENTIRE response body (should be JSON)
4. Expected format:
```json
{
  "success": false,
  "message": "Exam date must be today or in the future",
  "error": "IllegalArgumentException",
  "timestamp": "2026-08-15T08:25:30.123Z"
}
```
5. Go to **Headers** tab → **Request Payload**
6. Copy the payload being sent

### Step 3: Check Render Backend Logs

1. Go to: https://dashboard.render.com
2. Click on backend service
3. Go to **Logs** tab
4. Look for timestamp matching the failed request
5. Copy the full stack trace including:
   - Exception type (e.g., `IllegalArgumentException`, `NullPointerException`)
   - Error message
   - Stack trace showing which line failed

### Step 4: Common Exam Creation Failure Patterns

**Pattern A: Subject Not Found**
```
Error: "Subject not found"
Cause: subjectId from frontend doesn't exist in database
Fix: Verify subject exists, check UUID format
```

**Pattern B: Date Validation**
```
Error: "Exam date must be today or in the future"
Cause: examDate is in the past
Fix: Check date serialization (LocalDate vs ISO string)
```

**Pattern C: Field Validation**
```
Error: "difficulty must be one of: easy, medium, hard"
Cause: Difficulty value doesn't match pattern
Fix: Check enum values match exactly
```

**Pattern D: Student Mismatch**
```
Error: "Subject does not belong to student"
Cause: JWT studentId doesn't match subject's student
Fix: Check authentication, verify subject ownership
```

---

## INVESTIGATE BLOCKER #2: Issue 1 - Timetable Generation 500

### Step 1: Reproduce the Error

**Before Testing**: Open Browser DevTools → Network tab → Filter by "timetable"

1. Navigate to: `/timetable/generate`
2. Go through the 5-step wizard:
   - **Step 1**: Select at least 1 subject
   - **Step 2**: Set hours per day (e.g., 4)
   - **Step 3**: Select study style (e.g., "balanced")
   - **Step 4**: 
     - Start Date: Today
     - Duration: "2 weeks"
     - Planning Mode: "Use exam deadlines"
   - **Step 5**: Review and click "Generate My Timetable"
3. **Watch Network tab for**:
   - `POST /api/timetable/generate` request

### Step 2: Capture Error Details

**In Network Tab**:
1. Click on the failed `POST /api/timetable/generate` request
2. Go to **Response** tab
3. Copy the ENTIRE response body
4. Go to **Headers** tab → **Request Payload**
5. Copy the full payload (should include subjectIds, availableHoursPerDay, style, startDate, durationDays, useDeadlines, targetDeadlineDate)

### Step 3: Check Render Backend Logs

1. Go to Render dashboard → backend service → Logs
2. Find the request timestamp
3. Copy full stack trace including:
   - Exception type
   - Error message
   - Method where it failed (e.g., `TimetableService.generateAiTimetable`)

### Step 4: Common Timetable Generation Failure Patterns

**Pattern A: No Subjects**
```
Error: "No subjects found. Please add subjects first."
Cause: Student has no subjects in database
Fix: Add subjects before generating timetable
```

**Pattern B: Invalid Date Range**
```
Error: "Target deadline must be after start date"
Cause: targetDeadlineDate <= startDate
Fix: Validate date order in frontend
```

**Pattern C: Student Not Found**
```
Error: "Student not found"
Cause: JWT studentId invalid or student deleted
Fix: Check authentication flow
```

**Pattern D: Database Constraint Violation**
```
Error: "NULL not allowed for column 'week_start_date'"
Cause: weekStartDate not set in timetable entity
Fix: Ensure createNewTimetable() sets startDate
```

**Pattern E: Null Pointer in Slot Generation**
```
Error: "NullPointerException at TimetableService.generateTimetableSlotsForDuration"
Cause: subjects list empty or null weights
Fix: Add null checks in slot generation
```

---

## EVIDENCE COLLECTION CHECKLIST

For each failed request, collect:
- [ ] HTTP status code (should be 500)
- [ ] Response body (JSON with error message)
- [ ] Request payload (what frontend sent)
- [ ] Request headers (especially Authorization)
- [ ] Backend log stack trace
- [ ] Timestamp of failure
- [ ] User's authentication state (logged in user ID)

---

## NEXT STEPS AFTER COLLECTING EVIDENCE

Once you have the error details:

1. **For Exam Creation (Issue 6)**:
   - If validation error: Fix validation pattern/message
   - If subject not found: Check subject creation flow
   - If date issue: Fix date serialization
   - If student mismatch: Check JWT authentication

2. **For Timetable Generation (Issue 1)**:
   - If no subjects: Add subject existence check in frontend
   - If date issue: Add date validation in frontend
   - If null pointer: Add null safety checks in service
   - If database constraint: Fix entity field defaults

3. **Report Back**:
   - Exact error message
   - Request payload
   - Stack trace
   - Which pattern it matches

Then I can implement the precise fix needed.

---

## QUICK REFERENCE: Production URLs

- **Frontend**: `https://ai-study-planner-jhh9-j5sn6hhhh-aswinipavan.vercel.app`
- **Backend**: `https://ai-study-planner-hp0e.onrender.com`
- **Backend Health**: `https://ai-study-planner-hp0e.onrender.com/actuator/health`
