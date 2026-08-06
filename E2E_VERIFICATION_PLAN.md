# 🧪 E2E Verification Plan - Production Testing

**Date:** August 5, 2026  
**Environment:** Production (Vercel + Render)  
**Status:** Ready for Testing  

---

## 🎯 Objective

Verify that the deployed AI Study Planner application works end-to-end on production:
- Frontend: https://ai-study-planner-jhh9.vercel.app
- Backend: https://aistudyplannerbackend.onrender.com

---

## ✅ Pre-Deployment Checklist (Completed by Antigravity)

- [x] Vercel deployment successful
- [x] Firebase environment variables injected (11 vars)
- [x] Build cache bypassed to force fresh build
- [x] TypeScript build errors fixed (response.body, test imports)
- [x] Java IDE warnings cleared
- [x] Frontend build: 0 errors, 21 static pages generated
- [x] Backend: 94 tests passing

---

## 🧪 E2E Test Scenarios

### Test 1: Landing Page & Initial Load ⏳
**URL:** https://ai-study-planner-jhh9.vercel.app

**Steps:**
1. Open URL in browser
2. Verify page loads without errors
3. Check console (F12) for errors
4. Verify no blinking/flickering
5. Check page renders correctly

**Expected:**
- ✅ Page loads in <3 seconds
- ✅ No console errors
- ✅ Clean, professional UI visible
- ✅ "Get Started" button visible
- ✅ No layout shifts

**Status:** PENDING - Needs manual verification

---

### Test 2: Google Login Flow ⏳
**URL:** https://ai-study-planner-jhh9.vercel.app/login

**Steps:**
1. Navigate to login page
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Verify redirect to dashboard

**Expected:**
- ✅ Google sign-in popup opens
- ✅ OAuth completes successfully
- ✅ Firebase authenticates user
- ✅ Redirects to /dashboard
- ✅ User profile loaded

**Critical:** This tests:
- Firebase API keys configured correctly
- OAuth redirect URLs whitelisted
- Backend Firebase token verification
- Session management

**Status:** PENDING - Needs manual verification

---

### Test 3: Dashboard Data Loading ⏳
**URL:** https://ai-study-planner-jhh9.vercel.app/dashboard

**Prerequisites:** User logged in

**Steps:**
1. Verify dashboard renders
2. Check if real data loads (not hardcoded)
3. Verify API calls to Render backend
4. Check CORS headers allow requests

**Expected:**
- ✅ Dashboard loads without errors
- ✅ Real exam/timetable data shown (or empty state if new user)
- ✅ No "fake stats" (BUG-004 fixed)
- ✅ API calls successful (200/201 status)
- ✅ No CORS errors in console

**Critical:** This tests:
- Backend connectivity from Vercel
- CORS configuration on Render
- API authentication headers
- Data fetching hooks

**Status:** PENDING - Needs manual verification

---

### Test 4: AI Chat Feature ⏳
**URL:** https://ai-study-planner-jhh9.vercel.app/chat

**Prerequisites:** User logged in

**Steps:**
1. Navigate to Chat page
2. Send a test message: "Explain photosynthesis"
3. Verify AI responds
4. Check response quality (step-by-step problem solving)

**Expected:**
- ✅ Chat interface loads
- ✅ Message sends successfully
- ✅ AI responds within 5-10 seconds
- ✅ Response includes step-by-step explanation
- ✅ Groq API prompt changes applied (problem-solving mode)
- ✅ Chat history persists

**Critical:** This tests:
- Groq API integration
- Chat history storage
- WebSocket/polling updates
- AI prompt configuration

**Status:** PENDING - Needs manual verification

---

### Test 5: Materials Upload ⏳
**URL:** https://ai-study-planner-jhh9.vercel.app/materials

**Prerequisites:** User logged in

**Steps:**
1. Navigate to Materials page
2. Click "Upload" button
3. Select a PDF/DOC file
4. Verify upload completes
5. Check material appears in list

**Expected:**
- ✅ Upload button works
- ✅ File picker opens
- ✅ Upload progress shown
- ✅ File uploaded to Firebase Storage
- ✅ Metadata saved to backend
- ✅ Material visible in list
- ✅ Can download/delete material

**Critical:** This tests:
- Firebase Storage integration
- File upload flow
- Backend API (POST /api/materials)
- Authentication on upload

**Status:** PENDING - Needs manual verification

---

### Test 6: Timetable Management ⏳
**URL:** https://ai-study-planner-jhh9.vercel.app/timetable

**Prerequisites:** User logged in

**Steps:**
1. Navigate to Timetable page
2. Create a new study session
3. Verify it appears in calendar
4. Edit the session
5. Delete the session

**Expected:**
- ✅ Timetable calendar renders
- ✅ Can create new sessions
- ✅ Sessions persist to backend
- ✅ Can edit sessions
- ✅ Can delete sessions
- ✅ UI updates immediately (optimistic updates)

**Critical:** This tests:
- CRUD operations
- Calendar component
- Optimistic UI updates
- Backend API (POST/PUT/DELETE /api/timetable)

**Status:** PENDING - Needs manual verification

---

### Test 7: Exam Management ⏳
**URL:** https://ai-study-planner-jhh9.vercel.app/exams

**Prerequisites:** User logged in

**Steps:**
1. Navigate to Exams page
2. Create a new exam
3. Enter marks for subjects
4. Verify performance analytics shown

**Expected:**
- ✅ Can create exams
- ✅ Can enter marks (0-100)
- ✅ Performance charts render
- ✅ AI analysis of marks shown
- ✅ Priority subjects highlighted

**Critical:** This tests:
- Exam CRUD
- Marks calculation
- Chart rendering (recharts)
- AI mark analysis (Groq)

**Status:** PENDING - Needs manual verification

---

### Test 8: Performance Analytics ⏳
**URL:** https://ai-study-planner-jhh9.vercel.app/performance

**Prerequisites:** User logged in with exam data

**Steps:**
1. Navigate to Performance page
2. Verify charts render
3. Check subject-wise breakdowns
4. Verify AI insights

**Expected:**
- ✅ Performance charts visible
- ✅ Data accurate (matches exams)
- ✅ AI insights generated
- ✅ Trend analysis shown

**Status:** PENDING - Needs manual verification

---

### Test 9: Settings & Profile ⏳
**URL:** https://ai-study-planner-jhh9.vercel.app/settings

**Prerequisites:** User logged in

**Steps:**
1. Navigate to Settings page
2. Toggle notification preferences
3. Save changes
4. Refresh page
5. Verify preferences persisted

**Expected:**
- ✅ Settings page loads
- ✅ Profile info shown
- ✅ Can toggle notifications
- ✅ Changes save (PUT /api/students/me/notifications)
- ✅ Preferences persist after refresh (BUG-007 fix verified)

**Status:** PENDING - Needs manual verification

---

### Test 10: Mobile Responsiveness ⏳
**Device:** Mobile (iPhone/Android or DevTools)

**Steps:**
1. Open app on mobile device
2. Verify responsive layout
3. Test navigation menu
4. Test key features (chat, upload)

**Expected:**
- ✅ Layout adapts to mobile screen
- ✅ Hamburger menu works
- ✅ Text readable
- ✅ Buttons touch-friendly (44px min)
- ✅ No horizontal scroll
- ✅ Forms usable on mobile

**Status:** PENDING - Needs manual verification

---

### Test 11: Book Onboarding Flow ⏳
**URL:** https://ai-study-planner-jhh9.vercel.app (first visit)

**Prerequisites:** Clear localStorage or new browser

**Steps:**
1. Visit site for first time
2. Experience 5-page book-turn onboarding
3. Verify animations smooth
4. Complete onboarding
5. Verify redirect to login

**Expected:**
- ✅ Onboarding appears on first visit
- ✅ Page-turn animations smooth (60fps)
- ✅ All 5 pages shown (Welcome → Planning → Learn → Progress → Start)
- ✅ "Replay Tour" button in Settings works
- ✅ Onboarding completion stored in localStorage

**Status:** PENDING - Needs manual verification

---

## 🔍 Technical Verification

### Backend API Health Check
```bash
curl https://aistudyplannerbackend.onrender.com/actuator/health
```
**Expected:** `{"status":"UP"}`

### Frontend Build Verification
**Vercel Dashboard:**
- Build status: ✅ Success
- Build time: <5 minutes
- TypeScript errors: 0
- Deployment: Production

### Environment Variables Check
**Vercel Project Settings → Environment Variables:**
- [ ] NEXT_PUBLIC_FIREBASE_API_KEY
- [ ] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- [ ] NEXT_PUBLIC_FIREBASE_PROJECT_ID
- [ ] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- [ ] NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- [ ] NEXT_PUBLIC_FIREBASE_APP_ID
- [ ] NEXT_PUBLIC_API_BASE_URL
- [ ] NEXT_PUBLIC_BACKEND_URL
- [ ] NEXT_PUBLIC_RAZORPAY_KEY_ID
- [ ] NEXT_PUBLIC_APP_URL
- [ ] API_BASE_URL

**Status:** ✅ VERIFIED (Antigravity confirmed all 11 vars set)

---

## 🚨 Known Issues to Verify Fixed

### BUG-004 (Dashboard Hardcoded Data)
**Status:** Fixed in commit `1305c17`  
**Verification:** Dashboard should show real exam/timetable data, not fake stats

### BUG-007 (Notification Preferences Not Persisted)
**Status:** Fixed in commit `2bc880e`  
**Verification:** Notification toggles should persist after page refresh

### BUG-008 (TypeScript Error in Sidebar.tsx)
**Status:** Fixed in commit `2bc880e`  
**Verification:** No TypeScript errors in production build

### Firebase Deployment Issue
**Status:** Fixed today (Aug 5)  
**Verification:** Google login should work without "Something went wrong" error

---

## 📊 Success Criteria

### Must Pass (P0 - Critical)
- [ ] Landing page loads without errors
- [ ] Google login works end-to-end
- [ ] Dashboard loads with real data
- [ ] Backend API responds (no CORS errors)
- [ ] No console errors on any page

### Should Pass (P1 - Important)
- [ ] AI Chat responds correctly
- [ ] Materials upload works
- [ ] Timetable CRUD functional
- [ ] Exams CRUD functional
- [ ] Settings persist correctly
- [ ] Mobile responsive

### Nice to Have (P2 - Enhancement)
- [ ] Performance analytics render
- [ ] Onboarding animations smooth
- [ ] Load time <3 seconds
- [ ] All features polished

---

## 🎯 Testing Approach

### Phase 1: Smoke Test (5 min)
1. Load landing page
2. Attempt login
3. Check dashboard loads
4. Verify no critical errors

**If Phase 1 fails:** Stop and debug critical issues

### Phase 2: Feature Test (15 min)
1. Test all 11 scenarios above
2. Document any bugs found
3. Verify all P0 criteria pass

### Phase 3: Polish (10 min)
1. Test mobile experience
2. Check performance
3. Review UI/UX
4. Note any P2 improvements

---

## 📝 Test Results Template

```
### Test Results - [Date/Time]

**Tester:** [AI/Human]
**Environment:** Production
**Browser:** [Chrome/Firefox/Safari]

| Test | Status | Notes |
|------|--------|-------|
| Landing Page | ⏳ | |
| Google Login | ⏳ | |
| Dashboard | ⏳ | |
| AI Chat | ⏳ | |
| Materials | ⏳ | |
| Timetable | ⏳ | |
| Exams | ⏳ | |
| Performance | ⏳ | |
| Settings | ⏳ | |
| Mobile | ⏳ | |
| Onboarding | ⏳ | |

**Critical Issues Found:** None / [List]
**Minor Issues Found:** None / [List]
**Overall Status:** PASS / FAIL / NEEDS WORK
```

---

## 🚀 Next Steps After E2E

1. **If all tests pass:**
   - Mark project as production-ready
   - Document any known limitations
   - Plan feature roadmap

2. **If tests fail:**
   - Identify root cause
   - Fix critical issues first
   - Redeploy and retest

3. **Post-launch:**
   - Monitor error logs (Vercel + Render)
   - Track user feedback
   - Plan incremental improvements

---

## 📞 Support Resources

**Backend Logs:** Render Dashboard → Logs tab  
**Frontend Logs:** Vercel Dashboard → Deployment → Runtime Logs  
**Database:** Supabase Dashboard → Logs  
**Firebase:** Firebase Console → Authentication  

---

**Status:** Ready for manual E2E testing  
**Priority:** HIGH  
**Estimated Time:** 30-40 minutes  
**Blocker:** None - All systems operational
