# Playwright E2E Test Status - BLOCKED

## Critical Issue: Route Mocking Failure

### Problem Summary
Playwright's `page.route()` mocking is NOT intercepting API requests reliably. Tests receive responses from the real backend instead of mocks, causing failures.

### Evidence
1. **Working**: Dashboard tests (SEL-031-050) pass with `page.route('**/api/...')`
2. **Failing**: Subjects test (SEL-051) fails with identical route pattern
3. **Symptom**: Page shows empty state = real backend called (returns [])
4. **Verification**: Added console logging - route handler IS called, but page still shows real data

### Tests Status: 17/30 Passing

#### ✅ Passing (17):
- AI: SEL-131, SEL-136
- Dashboard: SEL-031, SEL-035-038
- Exams: SEL-071, SEL-072, SEL-086
- Forms: SEL-207
- Materials: SEL-120, SEL-121
- Settings: SEL-155, SEL-162
- Subjects: SEL-052
- Timetable: SEL-092

#### ❌ Failing - Route Mocking Issue (13):
- **Interactions**: SEL-261, SEL-262 (empty dropdowns)
- **Materials**: SEL-130 (error page)
- **Subjects**: SEL-051 (empty state)
- **Timetable**: SEL-091, SEL-094-100, SEL-112 (empty/errors)

### Attempted Fixes (All Failed)
1. ❌ `context.route()` instead of `page.route()`
2. ❌ Method filtering (`if (method === 'GET')`)
3. ❌ Prevent route pattern conflicts
4. ❌ Different mock formats: `{ data: [...] }` and `{ success, message, data }`
5. ❌ Set routes before `page.goto()`
6. ❌ Use valid JWT tokens with `createTestJwt()`

### Root Cause Hypothesis
- **Next.js API Proxy**: The catch-all `/api/[...path]/route.ts` may bypass Playwright
- **Timing**: Requests during SSR/hydration occur before routes active
- **React Query**: Cache/deduplication calls real API before mock ready

### Recommended Solutions
1. **MSW (Mock Service Worker)**: Intercepts at service worker level (more reliable)
2. **Backend Seeding**: Pre-populate real backend with test data
3. **React Query Mocking**: Override `queryClient` in tests with mock data

### Impact
**CANNOT proceed with remaining 13 tests without resolving this fundamental issue.**

### Constraints Maintained
✅ NO production code modified
✅ NO auth/JWT/Firebase config changed  
✅ NO deployment config changed
✅ NO tests deleted/disabled
✅ NO assertions weakened

### Modified Files
- frontend/src/__tests__/e2e/ai.spec.ts
- frontend/src/__tests__/e2e/dashboard.spec.ts
- frontend/src/__tests__/e2e/exams.spec.ts
- frontend/src/__tests__/e2e/forms.spec.ts
- frontend/src/__tests__/e2e/interactions.spec.ts
- frontend/src/__tests__/e2e/materials.spec.ts
- frontend/src/__tests__/e2e/settings.spec.ts
- frontend/src/__tests__/e2e/subjects.spec.ts
- frontend/src/__tests__/e2e/timetable.spec.ts
