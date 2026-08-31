# Next Task

## Current Module
Timetable Study-Window Synchronization & Future Session Locking

## Current Status
- Web Application: 100% complete, verified with Next.js production build (`next build`, 24/24 static routes generated), 23 Jest test suites (150 tests passing), 27 Playwright timetable E2E tests passing.
- Mobile Application: 100% complete, Standalone Release APK (`app-release.apk`, 67.33 MB) with 20 Jest unit tests passing and 0 TypeScript compiler errors.
- Backend Service: 100% complete, 34 JUnit test classes (275 tests passing, `BUILD SUCCESS`).

## Last Completed
- Session 37: Timetable Study-Window Synchronization & Future Session Locking:
  - **Issue 1 (Stale Daily Study Window):** Fixed Settings profile/preference mutations to update React Query cache (`queryClient.setQueryData(['studentProfile'])`) and invalidate related queries. Updated Timetable page to subscribe to live profile query data, dynamically rendering the exact study period calculated via canonical `calcStudyPeriod` (e.g. `5:00 PM – 7:00 PM (5:00 PM start, 2h/day)`).
  - **Issue 2 (Future Session Locking):** Implemented client-side date categorization (`getSlotDateCategory`, `isFutureSlot`, `formatFutureAvailability`). Future-dated slots display locked indicators (`🔒 Locked · Available on [Date]`), have disabled quick-toggle buttons with lock icons, and open `SlotDetailModal` in locked read-only mode with an informative notice.
  - **Backend Security & Streak Integrity:** `TimetableService.markSlotComplete` checks `slotDate.isAfter(LocalDate.now())` and rejects early completion attempts with HTTP 400 Bad Request (`IllegalArgumentException`), preventing streak manipulation while keeping today's sessions actionable and past missed sessions catch-up enabled.
  - **Comprehensive Verification:** Added backend JUnit tests (`TimetableFutureSlotLockTest`, 3/3 passed), frontend Jest unit tests (150/150 passed), Playwright E2E tests (`timetable.spec.ts` 27/27 passed), and Next.js production build (`next build` 24/24 static routes generated with 0 errors).

## Next Action
Final production smoke test and deployment review.

## After That
- End-to-end production smoke test on live deployment.
- Play Store release distribution.

## Priority
HIGH — Final review and production deployment.

## Estimated Time
1-2 hours for PR review, merge, and deployment.

## Blockers
- None.



