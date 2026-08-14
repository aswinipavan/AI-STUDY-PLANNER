# Next Task

**Updated:** 2026-08-12  
**Current Phase:** Playwright Test Stabilization

---

## Immediate Next Task: Fix Playwright Test Bugs

### Priority 1: Fix Authentication Tests (auth.spec.ts)
**Effort:** 2-4 hours  
**Impact:** Unblocks 6 test failures

#### Problem
Tests mock `/api/auth/login` REST endpoint, but the application uses Firebase Authentication SDK directly in the browser. The mocked endpoint is never called.

#### Solution Options

**Option A: Mock Firebase SDK (RECOMMENDED)**
```typescript
test.beforeEach(async ({ page, context }) => {
  // Skip onboarding
  await context.addInitScript(() => {
    localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
    
    // Mock Firebase
    window.firebase = {
      auth: () => ({
        signInWithEmailAndPassword: (email, password) => {
          if (password === 'wrongpassword') {
            return Promise.reject({ code: 'auth/wrong-password' });
          }
          return Promise.resolve({
            user: { uid: 'test-123', email: email }
          });
        },
        createUserWithEmailAndPassword: (email, password) => {
          return Promise.resolve({
            user: { uid: 'test-new', email: email }
          });
        }
      })
    };
  });
});
```

**Option B: Use Real Firebase Test Project**
- Set up dedicated Firebase test project
- Use real test accounts
- More reliable but slower tests

#### Tests to Fix
- SEL-001: Valid login redirection
- SEL-002: Invalid password error
- SEL-003: Unregistered email error
- SEL-007: Password too short validation (also check selector)
- SEL-009: Valid account registration
- SEL-010: Google OAuth (mark as skip or mock)

---

### Priority 2: Fix Navigation Tests (navigation.spec.ts)
**Effort:** 1-2 hours  
**Impact:** Unblocks 8 test failures

#### Problem
Tests navigate to `/dashboard` without setting up authentication cookies. Protected routes redirect to `/login`, so navigation links don't exist.

#### Solution
Update `navigation.spec.ts` beforeEach hook:

```typescript
test.beforeEach(async ({ page, context }) => {
  // Skip onboarding
  await context.addInitScript(() => {
    localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
  });
  
  // Set up authentication - ADD THIS
  await context.addCookies([{
    name: 'access_token',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.mock-signature',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false
  }]);
  
  // Mock auth API responses - ADD THIS
  await page.route('**/api/students/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ 
        data: { 
          id: 'test-123', 
          name: 'Test User', 
          email: 'test@example.com',
          isPremium: false
        } 
      })
    });
  });
  
  // Mock other API endpoints as needed
  await page.route('**/api/students/me/subjects', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ data: [] })
    });
  });
});
```

#### Tests to Fix
- SEL-182: Dashboard to subjects
- SEL-183: Dashboard to exams
- SEL-184: Dashboard to timetable
- SEL-185: Dashboard to materials
- SEL-186: Dashboard to chat
- SEL-187: Dashboard to performance
- SEL-188: Dashboard to settings
- SEL-189: Browser back button

---

### Priority 3: Execute Remaining Test Batches
**Effort:** 4-6 hours  
**Impact:** Complete test suite execution

#### Batches to Execute
1. Batch 3: subjects.spec.ts + exams.spec.ts + timetable.spec.ts + materials.spec.ts (~12 tests)
2. Batch 4: ai.spec.ts (15 tests)
3. Batch 5: analytics.spec.ts + settings.spec.ts + subscription.spec.ts + onboarding.spec.ts (~17 tests)
4. Batch 6: general.spec.ts + forms.spec.ts (35 tests)
5. Batch 7: errors.spec.ts + states.spec.ts (35 tests)
6. Batch 8: interactions.spec.ts + accessibility.spec.ts (30 tests)
7. Batch 9: workflows.spec.ts (10 tests)
8. Re-execute: auth.spec.ts remaining 5 tests (SEL-026 to SEL-030)
9. Re-execute: navigation.spec.ts remaining 11 tests (SEL-190 to SEL-200)

#### Execution Strategy
- Use `--workers=1` for sequential execution
- Set `--timeout=15000` (15 seconds per test)
- Use `--reporter=json` for structured output
- Run in smaller batches of 10-15 tests
- Document every failure immediately

---

## Success Criteria

### Before Moving to Next Phase
- [ ] All authentication tests pass or are properly skipped with justification
- [ ] All navigation tests pass
- [ ] At least 150/165 tests executed (90%+)
- [ ] Pass rate ≥ 95% for executed tests
- [ ] All failures documented with root cause analysis
- [ ] Zero unresolved application bugs

### Documentation Requirements
- [ ] Update TEST_EXECUTION_LEDGER.md with final counts
- [ ] Update FAILURE_ROOT_CAUSE_REPORT.md with any new failures
- [ ] Update CURRENT_PROJECT_STATUS.md with final statistics
- [ ] Update SESSION_LOG.md with completion summary

---

## Future Testing Phases (After Playwright Stabilization)

### Phase 2: API Testing
- Execute backend integration tests
- Test all REST API endpoints
- Validate request/response contracts
- Test error handling and edge cases

### Phase 3: Validation Testing
- Input validation tests
- Boundary value tests
- SQL injection tests
- XSS prevention tests

### Phase 4: Deployment Testing
- Smoke tests on staging environment
- Production deployment verification
- Rollback procedure testing

### Phase 5: Load Testing
- Performance benchmarking
- Stress testing
- Capacity planning

### Phase 6: Integration Testing
- End-to-end workflow tests
- Cross-feature integration tests
- Third-party service integration tests

---

## Estimated Timeline

**Test Stabilization:** 6-10 hours
- Fix auth tests: 2-4 hours
- Fix navigation tests: 1-2 hours
- Execute remaining batches: 3-4 hours

**Full Testing Completion:** 40-60 hours
- Playwright stabilization: 6-10 hours
- API testing: 10-15 hours
- Validation testing: 8-12 hours
- Deployment testing: 6-8 hours
- Load testing: 6-8 hours
- Integration testing: 4-7 hours

---

## Notes

**Important:** Do NOT move to API/Validation/Deployment/Load/Integration testing until the Playwright E2E suite is stable. The user explicitly mandated that browser E2E testing must be completed first.

**Current Blocker:** Test bugs in authentication and navigation tests. These are test implementation issues, NOT application bugs. The application works correctly.

**Confidence Level:** HIGH that fixes will resolve issues (root causes clearly identified, solutions proven in passing tests)
