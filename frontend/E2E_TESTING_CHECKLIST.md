# E2E Manual Testing Checklist - AI Study Planner

**Date:** July 22, 2026  
**Tester:** [Your Name]  
**Frontend URL:** http://localhost:3000 (dev) or Vercel deployment URL  
**Backend API:** https://aistudyplannerbackend.onrender.com  

---

## Prerequisites

Before running E2E tests:
- [ ] Backend is running and accessible (check health: https://aistudyplannerbackend.onrender.com/health)
- [ ] Frontend is running (`npm run dev` in `/frontend`)
- [ ] Browser DevTools console is open (F12) to check for errors
- [ ] Clear browser cookies/localStorage before starting

---

## Test Flow 1: User Authentication & Login

### Test 1.1: Email Sign In (Valid Credentials)
- [ ] Navigate to login page
- [ ] Click "Sign In" tab
- [ ] Enter valid email: `test@example.com`
- [ ] Enter valid password: `password123`
- [ ] Click "Sign In →" button
- [ ] **Expected:** Redirected to dashboard, user name visible in header
- [ ] **Verify:** Console shows no errors, auth token stored in localStorage
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 1.2: Email Sign In (Invalid Credentials)
- [ ] Navigate to login page
- [ ] Click "Sign In" tab
- [ ] Enter invalid email: `wrong@example.com`
- [ ] Enter password: `password123`
- [ ] Click "Sign In →" button
- [ ] **Expected:** Error message shown: "No account found with this email"
- [ ] **Verify:** Stays on login page, no redirect
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 1.3: Email Registration (New Account)
- [ ] Navigate to login page
- [ ] Click "Register" tab
- [ ] Enter name: `Test Student`
- [ ] Enter email: `newuser@example.com`
- [ ] Enter password: `secure123456`
- [ ] Confirm password: `secure123456`
- [ ] Click "Create Account →" button
- [ ] **Expected:** Account created, redirected to dashboard
- [ ] **Verify:** Email verification message appears (if applicable)
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 1.4: Google OAuth Sign In
- [ ] Navigate to login page
- [ ] Click "Continue with Google" button
- [ ] **Expected:** Google login popup appears
- [ ] Sign in with your Google account
- [ ] **Expected:** Redirected to dashboard after authentication
- [ ] **Verify:** User info matches Google account
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Test Flow 2: Materials Management

### Test 2.1: View Materials List
- [ ] Login to dashboard
- [ ] Navigate to "Materials" section
- [ ] **Expected:** See list of uploaded materials (if any exist)
- [ ] **Verify:** Each material shows: title, subject, category, file size, upload date
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 2.2: Filter Materials by Category
- [ ] From Materials list, click category filter dropdown
- [ ] Select "Physics"
- [ ] **Expected:** Only Physics materials shown
- [ ] Select "Chemistry"
- [ ] **Expected:** Only Chemistry materials shown
- [ ] Click "All" or clear filter
- [ ] **Expected:** All materials shown again
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 2.3: Upload New Material
- [ ] From Materials page, click "Upload Material" button
- [ ] Click drag-drop zone or "Click to upload"
- [ ] Select a PDF file (< 10 MB): `test_material.pdf`
- [ ] Enter/select subject: "Physics"
- [ ] Enter/select category: "Mechanics"
- [ ] Click "Upload" button
- [ ] **Expected:** Loading spinner appears, then success message
- [ ] **Expected:** New material appears in list
- [ ] **Verify:** File size and metadata correct
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 2.4: Delete Material
- [ ] From Materials list, hover over a material
- [ ] Click "Delete" button
- [ ] **Expected:** Confirmation dialog appears: "Are you sure?"
- [ ] Click "Cancel"
- [ ] **Expected:** Material still in list
- [ ] Hover over same material again, click "Delete"
- [ ] Click "Confirm"
- [ ] **Expected:** Material removed from list, success message shown
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 2.5: Search/Sort Materials
- [ ] From Materials page, use search bar (if available)
- [ ] Search for: "Physics"
- [ ] **Expected:** Only materials with "Physics" in name shown
- [ ] Click sort dropdown (by date, name, size)
- [ ] **Expected:** Materials reorder correctly
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Test Flow 3: Timetable Management

### Test 3.1: View Weekly Timetable
- [ ] Login to dashboard
- [ ] Navigate to "Timetable" section
- [ ] **Expected:** See weekly view (Mon-Sun or Mon-Fri)
- [ ] **Verify:** All days displayed with scheduled subjects
- [ ] **Verify:** Subject names, times, and duration shown
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 3.2: Add Study Session
- [ ] From Timetable, click "Add Session" or "+ " button
- [ ] Fill form:
  - [ ] Subject: "Physics"
  - [ ] Day: "Monday"
  - [ ] Start Time: "09:00"
  - [ ] End Time: "10:30"
  - [ ] Topic: "Newton's Laws"
- [ ] Click "Save"
- [ ] **Expected:** New session appears on Monday in timetable
- [ ] **Verify:** Duration calculated correctly (90 minutes)
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 3.3: Edit Study Session
- [ ] From Timetable, click on existing session
- [ ] Click "Edit" button
- [ ] Change topic to: "Quantum Mechanics"
- [ ] Click "Save"
- [ ] **Expected:** Session updated with new topic
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 3.4: Delete Study Session
- [ ] From Timetable, hover over session
- [ ] Click "Delete" button
- [ ] **Expected:** Confirmation dialog
- [ ] Click "Confirm"
- [ ] **Expected:** Session removed from timetable
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 3.5: View Study Hours & Statistics
- [ ] From Timetable, look for summary section
- [ ] **Expected:** See "Total Weekly Study Hours" (e.g., "15 hours")
- [ ] **Expected:** See breakdown by subject (e.g., "Physics: 5 hours")
- [ ] **Verify:** Numbers match sessions scheduled
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Test Flow 4: Exam Management

### Test 4.1: View Upcoming Exams
- [ ] Login to dashboard
- [ ] Navigate to "Exams" section
- [ ] **Expected:** See "Upcoming Exams" section
- [ ] **Expected:** Each exam shows: name, subject, date, time, total marks, passing marks
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 4.2: Add New Exam
- [ ] From Exams page, click "Add Exam" button
- [ ] Fill exam form:
  - [ ] Exam Name: "Physics Mid-Term"
  - [ ] Subject: "Physics"
  - [ ] Date: [Select future date]
  - [ ] Duration: 120 minutes
  - [ ] Total Marks: 100
  - [ ] Passing Marks: 40
- [ ] Click "Create Exam"
- [ ] **Expected:** Exam added to list
- [ ] **Verify:** Exam appears under "Upcoming Exams"
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 4.3: Mark Exam as Completed
- [ ] From Exams list, click on an upcoming exam
- [ ] Click "Mark as Completed" or "Enter Marks" button
- [ ] Enter marks obtained: 85
- [ ] Click "Submit"
- [ ] **Expected:** Exam moves to "Past Exams" section
- [ ] **Expected:** Shows marks: "85/100 (85%)"
- [ ] **Verify:** Performance status shown (Pass/Fail)
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 4.4: View Performance Metrics
- [ ] Navigate to "Exams" section
- [ ] Scroll to "Performance Summary"
- [ ] **Expected:** See average marks across all exams
- [ ] **Expected:** See trend (improving/declining)
- [ ] **Verify:** Recommendations shown for low-performing subjects
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 4.5: Delete Exam
- [ ] From Exams list, click on an exam
- [ ] Click "Delete" button
- [ ] **Expected:** Confirmation dialog
- [ ] Click "Confirm"
- [ ] **Expected:** Exam removed from list
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Test Flow 5: AI Chat Assistant

### Test 5.1: Send Chat Message
- [ ] Navigate to "Chat" or "AI Assistant" section
- [ ] Type in input field: "Explain photosynthesis"
- [ ] Click "Send" or press Enter
- [ ] **Expected:** Message appears in chat (user side, right-aligned)
- [ ] **Expected:** Loading indicator appears
- [ ] **Expected:** AI response appears (left-aligned, assistant message)
- [ ] **Verify:** Response is relevant to the question
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 5.2: Multi-turn Conversation
- [ ] Continue from Test 5.1
- [ ] Type follow-up question: "What about the light reactions?"
- [ ] Click "Send"
- [ ] **Expected:** AI maintains context from previous messages
- [ ] **Expected:** Response addresses follow-up question
- [ ] **Verify:** Chat history shows all messages in order
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 5.3: Clear Chat History
- [ ] From Chat page, click "New Chat" or "Clear History" button (if available)
- [ ] **Expected:** Confirmation dialog: "Clear all messages?"
- [ ] Click "Confirm"
- [ ] **Expected:** All chat messages cleared
- [ ] **Verify:** Fresh chat session starts
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 5.4: Chat Error Handling
- [ ] From Chat, type a message
- [ ] Intentionally disconnect backend (stop server or go offline)
- [ ] Click "Send"
- [ ] **Expected:** Error message appears: "Failed to send message" or "Server error"
- [ ] **Expected:** Message is not lost (still in input or cached)
- [ ] Reconnect backend
- [ ] Try sending again
- [ ] **Expected:** Message sends successfully
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 5.5: Rate Limiting
- [ ] From Chat, send 10+ messages rapidly
- [ ] **Expected:** Either:
  - [ ] All messages process normally, OR
  - [ ] Rate limit message appears after threshold
  - [ ] UI shows: "Please wait before sending another message"
- [ ] Wait for cooldown period
- [ ] Send another message
- [ ] **Expected:** Message sends successfully
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Test Flow 6: Cross-Feature Integration

### Test 6.1: Materials Linked to Exams
- [ ] Navigate to Exams
- [ ] Add new exam for "Physics"
- [ ] Look for "Recommended Materials" section
- [ ] **Expected:** Physics materials from Materials section displayed
- [ ] Click on a material
- [ ] **Expected:** Material details shown or download available
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 6.2: Timetable Linked to Exams
- [ ] Navigate to Exams
- [ ] Click on an upcoming exam (e.g., Physics exam on Friday)
- [ ] **Expected:** Timetable shows related study sessions
- [ ] **Expected:** Study time allocated for this subject shown
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 6.3: Chat With Context
- [ ] Navigate to Chat
- [ ] Type: "Help me prepare for my Physics exam"
- [ ] **Expected:** AI responds with reference to your scheduled Physics exam
- [ ] Type: "What topics should I focus on?"
- [ ] **Expected:** AI references materials and study sessions from your account
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 6.4: Dashboard Summary
- [ ] Navigate to Dashboard/Home
- [ ] **Expected:** See summary cards:
  - [ ] "Next Exam: Physics (3 days away)"
  - [ ] "Study Hours This Week: 15 hours"
  - [ ] "Materials Uploaded: 5"
  - [ ] "Average Score: 82%"
- [ ] **Verify:** Numbers are accurate and up-to-date
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Test Flow 7: User Settings & Profile

### Test 7.1: Edit Profile
- [ ] Click profile icon/avatar in header
- [ ] Click "Profile Settings" or "Edit Profile"
- [ ] **Expected:** Profile form appears with current data
- [ ] Change name to: "Updated Name"
- [ ] Click "Save"
- [ ] **Expected:** Success message shown
- [ ] **Verify:** Header shows updated name
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 7.2: Change Password
- [ ] From Profile/Settings, click "Change Password"
- [ ] Enter current password
- [ ] Enter new password: `newpass123456`
- [ ] Confirm new password: `newpass123456`
- [ ] Click "Update Password"
- [ ] **Expected:** Success message
- [ ] Logout and login with new password
- [ ] **Expected:** Login successful with new password
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 7.3: View Subscription Status
- [ ] From Profile/Settings, check "Subscription" section
- [ ] **Expected:** Current plan shown (Free/Premium)
- [ ] If Free: See "Upgrade" button
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Test Flow 8: Notifications & Alerts

### Test 8.1: Exam Reminder
- [ ] Create an exam scheduled for tomorrow
- [ ] **Expected:** Notification or banner: "Exam tomorrow: Physics"
- [ ] Click notification
- [ ] **Expected:** Directed to Exams page with exam highlighted
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 8.2: Study Session Reminder
- [ ] Create a study session for today in Timetable
- [ ] **Expected:** At session start time, notification appears: "Study session starting: Physics (30 min)"
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 8.3: Dismiss Notification
- [ ] From any notification, click "X" or "Dismiss"
- [ ] **Expected:** Notification removed
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Test Flow 9: Responsive Design & Mobile

### Test 9.1: Mobile View (Portrait)
- [ ] Open frontend on mobile device or use DevTools device emulation
- [ ] Set to iPhone 12 or similar
- [ ] **Expected:** Layout adapts to narrow screen
- [ ] **Verify:** Navigation menu becomes hamburger menu
- [ ] **Verify:** All text is readable, no horizontal scroll
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 9.2: Mobile View (Landscape)
- [ ] Rotate device to landscape or DevTools
- [ ] **Expected:** Layout adjusts appropriately
- [ ] **Verify:** Content is readable and accessible
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 9.3: Touch Interactions
- [ ] On mobile, try all touch interactions:
  - [ ] Swipe to navigate (if swiping is implemented)
  - [ ] Tap buttons
  - [ ] Tap and hold for context menu (if applicable)
- [ ] **Expected:** All interactions work smoothly
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Test Flow 10: Accessibility

### Test 10.1: Keyboard Navigation
- [ ] Navigate entire app using only Tab key (no mouse)
- [ ] **Expected:** Tab order is logical (top to bottom, left to right)
- [ ] **Expected:** Focus is visible on each element
- [ ] **Verify:** Can reach and activate all buttons/links
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 10.2: Screen Reader (NVDA/JAWS/VoiceOver)
- [ ] Enable screen reader on your system
- [ ] Navigate home page
- [ ] **Expected:** All text is readable
- [ ] **Expected:** Images have alt text
- [ ] **Expected:** Form labels are associated with inputs
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 10.3: Color Contrast
- [ ] Use browser accessibility checker or WAVE tool
- [ ] **Expected:** All text meets WCAG AA contrast ratio (4.5:1)
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Test Flow 11: Performance & Loading

### Test 11.1: Page Load Time
- [ ] Open DevTools Network tab
- [ ] Refresh home page
- [ ] **Expected:** Page loads in < 3 seconds
- [ ] **Verify:** Largest Contentful Paint (LCP) < 2.5s
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 11.2: Image Optimization
- [ ] From DevTools Network, check image sizes
- [ ] **Expected:** Images are compressed (< 100KB for thumbnails)
- [ ] **Expected:** Modern formats used (WebP if supported)
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 11.3: API Response Time
- [ ] From DevTools Network, filter by XHR/Fetch
- [ ] Send chat message and observe API call
- [ ] **Expected:** API responds within 2-5 seconds
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Test Flow 12: Logout & Session Management

### Test 12.1: Normal Logout
- [ ] Click profile icon and "Logout"
- [ ] **Expected:** Redirected to login page
- [ ] **Verify:** Auth token removed from localStorage
- [ ] Try navigating back to dashboard (URL direct)
- [ ] **Expected:** Redirected to login page
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 12.2: Session Timeout
- [ ] Login to app
- [ ] Leave browser idle for 30+ minutes
- [ ] Try to perform an action (send chat message)
- [ ] **Expected:** Either:
  - [ ] Auto-logout with message "Session expired, please login again", OR
  - [ ] Automatic re-authentication without user notice
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 12.3: Multiple Tabs
- [ ] Open app in 2 tabs
- [ ] Logout from Tab 1
- [ ] Switch to Tab 2
- [ ] Try to perform action
- [ ] **Expected:** Either redirected to login or session synced across tabs
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Test Flow 13: Error Handling & Edge Cases

### Test 13.1: Network Error Recovery
- [ ] Perform action that calls API (e.g., send chat)
- [ ] Intentionally disconnect internet (or disable network in DevTools)
- [ ] **Expected:** Error message shown: "Network error" or "Connection lost"
- [ ] **Expected:** Retry button or auto-retry after 5 seconds
- [ ] Reconnect network
- [ ] Click retry or wait for auto-retry
- [ ] **Expected:** Action completes successfully
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 13.2: Invalid Data Entry
- [ ] Try to upload file > 50 MB
- [ ] **Expected:** Error: "File too large"
- [ ] Try to create exam without subject
- [ ] **Expected:** Error: "Subject is required"
- [ ] Try to set end time before start time
- [ ] **Expected:** Error: "End time must be after start time"
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 13.3: Concurrent Operations
- [ ] Upload a file while sending a chat message
- [ ] **Expected:** Both operations complete without conflict
- [ ] **Verify:** UI remains responsive
- [ ] **Status:** ✓ PASS / ✗ FAIL

### Test 13.4: Rate Limiting & Throttling
- [ ] Perform 5+ API calls rapidly (upload files, send chats)
- [ ] **Expected:** App either processes all OR shows rate limit message
- [ ] **Verify:** No crashes or errors
- [ ] **Status:** ✓ PASS / ✗ FAIL

---

## Browser Compatibility Testing

Test on:
- [ ] Chrome (latest) - Desktop
- [ ] Firefox (latest) - Desktop
- [ ] Safari (latest) - Desktop
- [ ] Edge (latest) - Desktop
- [ ] Chrome Mobile - Android
- [ ] Safari Mobile - iOS

For each browser, verify:
- [ ] Login/logout works
- [ ] Materials upload works
- [ ] Timetable displays correctly
- [ ] Chat sends messages
- [ ] No console errors
- [ ] Responsive design works

---

## Final Checklist

Before marking testing complete:

- [ ] All 13 test flows completed
- [ ] No critical bugs found
- [ ] All features working as expected
- [ ] No console errors
- [ ] Performance acceptable (< 3s page load)
- [ ] Mobile responsive design works
- [ ] Accessibility checks passed
- [ ] Cross-browser testing completed

---

## Issues Found

Document any issues here:

| Issue # | Component | Severity | Description | Status |
|---------|-----------|----------|-------------|--------|
| 1 |  | [ ] Critical / [ ] Major / [ ] Minor |  | [ ] Fixed / [ ] Pending |
| 2 |  | [ ] Critical / [ ] Major / [ ] Minor |  | [ ] Fixed / [ ] Pending |

---

## Sign-Off

- **Tester Name:** ________________
- **Date Tested:** ________________
- **Overall Status:** [ ] PASS / [ ] PASS WITH ISSUES / [ ] FAIL
- **Notes:** 

---

## Notes for Manual Testing

1. **Test Accounts Available:**
   - Email: `test@example.com` / Password: `password123`
   - Or create new account via registration

2. **Test Data Shortcuts:**
   - Pre-created materials: Available in Materials section
   - Sample exams: Available in Exams section
   - Pre-scheduled timetable: Available in Timetable section

3. **Common Issues to Watch:**
   - Firebase auth tokens expiring
   - API rate limiting on Groq AI responses
   - Image upload file size limits
   - Browser cache affecting page reload

4. **Debugging Tips:**
   - Check DevTools Console for JavaScript errors
   - Check DevTools Network tab for failed API calls
   - Check browser localStorage for auth tokens
   - Check browser cookies for session data

---

**End of E2E Testing Checklist**
