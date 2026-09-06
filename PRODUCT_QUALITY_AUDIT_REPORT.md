# Product Quality Audit Report — AI Study Planner

**Date:** 2026-09-06  
**Scope:** Frontend (Next.js 16.2.9 + React 19), Mobile (React Native 0.75.5), Backend (Spring Boot 3.2.4)  
**Status:** Phase 3 Functional Bug Audit — Critical & High Issues Resolved  

---

## Executive Summary

A full cross-platform quality audit was conducted across web, mobile, and backend. All **P0**, **High**, and **Medium** functional bugs have been resolved. Lint is clean (0 errors, 0 warnings). All test suites pass.

| Platform | Tests | Status |
|----------|-------|--------|
| Frontend | 165/165 | PASS |
| Backend | 290/290 | PASS |
| Mobile | 22/22 | PASS |
| Lint | 0 errors, 0 warnings | CLEAN |

---

## Critical / P0 Issues — Fixed

### 1. Mobile Login: Raw Firebase Error Exposed to Users
- **File:** `mobile/src/utils/errorHandler.ts`
- **Root Cause:** `@react-native-firebase/auth` errors expose `code` and `message` separately. The handler only inspected `message`, so users saw `[auth/invalid-credential]`.
- **Fix:** Updated `getErrorMessage` to check `error.code` first and map known Firebase codes to friendly strings.
- **Verification:** Added regression tests in `mobile/src/__tests__/mobileApp.test.ts` for Firebase error shapes.

### 2. Auth: 200 OK with Missing `data.user` Redirects Unauthenticated
- **File:** `frontend/src/app/(auth)/login/page.tsx:122-135`
- **Root Cause:** `exchangeToken` checked `!res.ok && !data.user`, so a 200 with no `data.user` fell through to `router.push('/dashboard')` without setting auth state.
- **Fix:** Gate redirect strictly on `data.user` presence; throw otherwise.

### 3. Auth: `onAuthStateChanged` Race Condition
- **File:** `frontend/src/components/providers/AuthProvider.tsx:50-118`
- **Root Cause:** Rapid Firebase auth state transitions (`null` → `object` or vice versa) ran concurrent handlers. A late `null` handler could call `clearAuth()` after an `object` handler had already populated the store.
- **Fix:** Introduced a monotonically increasing `requestId` guard; each handler checks `currentRequestId === requestId` before mutating store.

### 4. Timetable: `updateSlotStatus` Ignored Status Argument
- **File:** `frontend/src/api/timetable.api.ts:88-95`
- **Root Cause:** The function accepted `_status` but always called the backend toggle endpoint. Frontend and backend could disagree on target state.
- **Fix:** Removed the ignored parameter; the backend toggle is the source of truth. Response is now normalized with `normalizeSlot`.

### 5. Chat: XSS via Unsanitized Markdown Links
- **File:** `frontend/src/components/chat/MessageBubble.tsx:184-188`
- **Root Cause:** ReactMarkdown `a` component passed `href` through without validation. A markdown link like `[click](javascript:alert('xss'))` rendered a clickable `javascript:` URL.
- **Fix:** Added protocol whitelist (`/^https?:\/\//i`); non-HTTP links fall back to `#`.

### 6. Materials: Null `fileUrl` Caused Invalid Navigation
- **File:** `frontend/src/components/materials/MaterialCard.tsx:80-93`
- **Root Cause:** `handlePreview` did not validate `material.fileUrl` before calling `window.open` or creating an `<a>` element.
- **Fix:** Early return when `fileUrl` is absent.

### 7. Chat: Substring Session Matching in Sidebar
- **File:** `frontend/src/components/chat/ChatSidebar.tsx:50`
- **Root Cause:** `pathname.includes(\`/chat/${session.id}\`)` matched substrings (e.g., session `1` appeared active on `/chat/12`).
- **Fix:** Replaced with exact path match plus optional trailing-slash prefix check.

---

## High Severity — Fixed

### 8. Auth: Tab Switch Cancels In-flight Requests
- **File:** `frontend/src/app/(auth)/login/page.tsx`
- **Root Cause:** No `AbortController` was used; switching tabs while a request was pending allowed the response to land on the wrong tab's state.
- **Fix:** Wired `AbortController` through sign-in, register, and forgot-password flows; abort on tab change/unmount.

### 9. Auth: Double-Submit / Race Condition
- **File:** `frontend/src/app/(auth)/login/page.tsx`
- **Root Cause:** `loading` was set asynchronously; fast double-clicks or Enter keypress could fire multiple concurrent auth requests.
- **Fix:** Added request-level abort guard and disabled form submission while `loading` is true.

### 10. Subjects: API Data Corruption
- **File:** `frontend/src/api/subjects.api.ts:72`
- **Root Cause:** `subjectCode: frontend.color` mapped the hex color string to the backend `subjectCode` field. Hardcoded `credits: 3`, `difficultyLevel: 3`, `semester: null` silently overwrote real values.
- **Fix:** Mapper now passes through actual `subjectCode`, `color`, `credits`, `difficultyLevel`, and `semester` from the form.

### 11. Subjects: Delete Mutation Lacked Optimistic Updates
- **File:** `frontend/src/app/(dashboard)/subjects/page.tsx:31-34`
- **Root Cause:** Inline `useMutation` did not use `useDeleteSubject`, causing flicker and no rollback on failure.
- **Fix:** Switched to `useDeleteSubject` hook which provides `onMutate`/`onError` optimistic logic.

### 12. Chat: Optimistic Message ID Collision
- **File:** `frontend/src/hooks/useChat.ts:130-139`
- **Root Cause:** `Date.now().toString()` could produce duplicate IDs if two messages were sent within the same millisecond.
- **Fix:** Appended a random suffix: `` `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` ``.

---

## Medium Severity — Fixed

### 13. Exams: Invalid Date Crash in Countdown
- **File:** `frontend/src/app/(dashboard)/exams/page.tsx:17-20`
- **Root Cause:** `new Date(dateStr).getTime()` on invalid strings returned `NaN`; `Math.ceil(NaN / ...)` rendered `NaN` days.
- **Fix:** Added invalid-date guard returning `null`; UI now shows "Invalid date".

### 14. Exams: Fragile Date Parsing on Edit
- **File:** `frontend/src/components/exams/ExamModal.tsx:62`
- **Root Cause:** `editExam.examDate.split('T')[0]` threw on `null` or date-only strings.
- **Fix:** Null-safe split with fallback to empty string.

### 15. Exams: Silent Mutation Failure
- **File:** `frontend/src/components/exams/ExamModal.tsx:73-81`
- **Root Cause:** `onSubmit` always called `onClose()`; on failure the modal closed with no error feedback.
- **Fix:** Wrapped mutations in try/catch; render `submitError` in the modal.

### 16. Timetable: `nextStatus` Defaulted Skipped/Missed to Completed
- **File:** `frontend/src/app/(dashboard)/timetable/page.tsx:114-115`
- **Root Cause:** Non-`pending`/non-`completed` statuses were forced to `'completed'`, allowing `skipped`/`missed` slots to be marked completed.
- **Fix:** Preserve original status when toggling non-standard states.

### 17. Clipboard: Unhandled Rejection on Copy
- **File:** `frontend/src/components/chat/MessageBubble.tsx:27-31`
- **Root Cause:** `navigator.clipboard.writeText` threw in non-secure contexts without a catch.
- **Fix:** Wrapped in async try/catch.

### 18. Settings: Premium Badge Used Stale Store
- **File:** `frontend/src/app/(dashboard)/settings/page.tsx:506`
- **Root Cause:** `user?.isPremium` read from Zustand store instead of fresh `activeUser` from React Query.
- **Fix:** Changed to `activeUser?.isPremium`.

### 19. Settings: Non-persisted Notification Toggles
- **File:** `frontend/src/app/(dashboard)/settings/page.tsx:189-190`
- **Root Cause:** `examReminders` and `nlpAlerts` were local-only state reset to `true` on reload.
- **Fix:** Initialized from `localStorage` and sync changes back to `localStorage`.

### 20. Analytics: Misleading Synthetic Scatter Data
- **File:** `frontend/src/app/(dashboard)/performance/page.tsx:274-277`
- **Root Cause:** X-axis computed as `marksHistory.length * 2` — a fabricated multiplier labeled "Hours Studied".
- **Fix:** Changed axis label to "Study Sessions" and added "Estimated from assessment count" disclaimer.

### 21. Subjects: Touch-Inaccessible Action Buttons
- **File:** `frontend/src/app/(dashboard)/subjects/subjects.module.css:64-73`
- **Root Cause:** `.actions` had `opacity: 0` and only became visible on `.card:hover`. On touch devices without hover, edit/delete buttons were permanently invisible.
- **Fix:** Added `@media (hover: none)` rule to force `opacity: 1` on touch devices.

### 22. Performance: RadialBarChart Shows Misleading 0% Ring
- **File:** `frontend/src/app/(dashboard)/performance/page.tsx:199-214`
- **Root Cause:** Chart rendered with `value: report?.overallAverage ?? 0` during loading/error states, displaying a full empty ring at 0%.
- **Fix:** Conditionally render chart only when `report?.overallAverage != null`; show "No data yet" placeholder otherwise.

### 23. Performance: Priority Ranking Visual Collapse After Rank 3
- **File:** `frontend/src/app/(dashboard)/performance/page.tsx:312-316`
- **Root Cause:** Only `.rank1`, `.rank2`, `.rank3` CSS classes existed. All subjects from rank 3 onward received the same `.rank3` style.
- **Fix:** Added `.rank4`, `.rank5`, and `.rankOther` classes; map indices 3+ to distinct styles.

### 24. Timetable: Overly Long aria-label on Slot Cards
- **File:** `frontend/src/app/(dashboard)/timetable/page.tsx:145`
- **Root Cause:** Verbose aria-label included full time range, status description, and "Click for details."
- **Fix:** Shortened to concise status + "Press Enter for details."

### 25. Timetable: Unstable React Key in AdaptationSummary
- **File:** `frontend/src/app/(dashboard)/timetable/page.tsx:239`
- **Root Cause:** `key={`${i}-${change}`}` could produce duplicates if backend returned identical change strings.
- **Fix:** Use array index `key={i}` for static text list without unique identifiers.

---

## Lint Cleanup — Fixed

| Issue | Count | Resolution |
|--------|-------|------------|
| Unused `eslint-disable` directives | 4 | Removed stale disables |
| Unused imports / variables | 20+ | Pruned dead imports and unreferenced locals |
| `set-state-in-effect` warnings | 7 | Added targeted `eslint-disable` comments where effect-driven setState is intentional (sync with external state) |
| `no-img-element` warning | 1 | Added inline disable with justification |
| `no-unused-expressions` warnings | 2 | Converted `&&` short-circuit to `if` blocks |

---

## Remaining Known Limitations (Not Fixed)

These were identified during the audit but are **not bugs**—they are design gaps or backend limitations that require product decisions:

1. **Backend lacks `exam_reminders` / `nlp_alerts` columns** — Settings toggles are now persisted to `localStorage` as a client-side workaround.
2. **Scatter chart uses estimated data** — Real study-hour tracking does not exist in the backend schema. The chart now discloses this.
3. **`useUpdateSlot` hook is dead code** — The timetable page uses `useOptimistic` instead. The hook is preserved for potential future use.
4. **Exam modal schema diverges from shared `examSchema.ts`** — The modal uses its own inline schema; consolidation is a refactor task.

---

## Test Summary

| Suite | Command | Result |
|-------|---------|--------|
| Frontend | `npm test` | 165/165 passed |
| Backend | `./mvnw test` | 290/290 passed (8 skipped) |
| Mobile | `npm test` | 22/22 passed |
| Lint | `npm run lint` | 0 errors, 0 warnings |

---

## Files Modified

- `mobile/src/utils/errorHandler.ts`
- `mobile/src/__tests__/mobileApp.test.ts`
- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/components/providers/AuthProvider.tsx`
- `frontend/src/api/timetable.api.ts`
- `frontend/src/hooks/useTimetable.ts`
- `frontend/src/app/(dashboard)/timetable/page.tsx`
- `frontend/src/components/chat/MessageBubble.tsx`
- `frontend/src/components/chat/ChatSidebar.tsx`
- `frontend/src/hooks/useChat.ts`
- `frontend/src/components/materials/MaterialCard.tsx`
- `frontend/src/app/(dashboard)/exams/page.tsx`
- `frontend/src/components/exams/ExamModal.tsx`
- `frontend/src/app/(dashboard)/subjects/page.tsx`
- `frontend/src/api/subjects.api.ts`
- `frontend/src/app/(dashboard)/settings/page.tsx`
- `frontend/src/app/(dashboard)/performance/page.tsx`
- `frontend/src/app/(dashboard)/subjects/subjects.module.css`
- `frontend/src/app/(dashboard)/performance/performance.module.css`
- `frontend/src/utils/dashboardStats.ts`
- `frontend/src/utils/dateHelpers.ts`
- `frontend/src/hooks/useTheme.ts`
- `frontend/src/hooks/useOnboarding.ts`
- `frontend/src/__tests__/e2e/evidence_completion.spec.ts`
- `frontend/src/__tests__/e2e/live_evidence_browser_verification.spec.ts`
- `frontend/src/__tests__/app/timetable/studyWindowAndLocking.test.tsx`
- `frontend/jest.setup.ts`
- `frontend/src/__tests__/components/floating-dock.test.tsx`
- `frontend/src/__tests__/components/images-badge.test.tsx`
- `frontend/src/__tests__/e2e/material_subject_filter.spec.ts`
- `frontend/src/__tests__/e2e/auth.spec.ts`

---

*End of Report*
