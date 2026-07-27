# Next Task

## READY — Sign In & Verify Live Data

Now that all hardcoded data and bugs are fixed, the next step is to:

### 1. Sign in with a real account
- Go to http://localhost:3000/login
- Sign in with email/password or Google
- Verify the dashboard shows:
  - Stats from your real data (0s if no data yet — not fake numbers)
  - Focus Areas from priority API (or empty state message)
  - Today's schedule from real timetable

### 2. Add your real data
Follow this onboarding flow:
1. `/subjects` → Add your subjects (e.g. Physics, Math, Chemistry)
2. `/exams` → Add upcoming exams with dates and difficulty
3. `/timetable/generate` → Generate AI timetable based on your subjects
4. `/materials` → Upload your study materials (PDFs, docs, images)
   - AI will automatically summarize and categorize them
5. `/performance` → Add marks after exams to see analytics

### 3. Open Items (if you want to continue developing)
- **BUG-007**: Wire notification preferences to backend API endpoint
- **Backend tests**: MaterialControllerTest now unblocked — run `mvn test` in backend/
- **Performance page**: Add mark entry form directly in UI (currently requires API call)

## What Was Fixed This Session ✅
- BUG-004: Dashboard fake data → real API data
- BUG-006: Timetable error toast
- BUG-007 (partial): Notification UI note added
- MaterialCard: AI Summary + AI Category badge display
- spring-security-test added to pom.xml → MaterialControllerTest unblocked
