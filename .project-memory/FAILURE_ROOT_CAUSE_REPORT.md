# Failure Root Cause Report

This document records all defects, failed assertions, and system anomalies identified during testing.

**Last Updated:** 2026-08-12 (Session 2)

---

## Failure Ledger

| Failure ID | Test ID | Category | Classification | Root Cause | Affected File | Status | Fix Applied |
|------------|---------|----------|----------------|------------|---------------|--------|-------------|
| RC-001 | N/A | Jest Config | Test Infrastructure Bug | testPathIgnorePatterns excludes wrong path | jest.config.ts | ✅ FIXED | Updated to `<rootDir>/src/__tests__/e2e/` |
| RC-002 | N/A | API Integration | Application Bug | Backend returns ApiResponse wrapper, frontend expects unwrapped | ai.api.ts, chat.api.ts | ✅ FIXED | Added response.data?.data unwrapping |
| RC-003 | SEL-181 to SEL-300 | Playwright | Test Quality Bug | 120 placeholder tests that all do the same thing | general.spec.ts | ⚠️ IDENTIFIED | Need to replace with meaningful tests |

---

## Detailed Root Cause Analyses

### RC-001: Jest Configuration Path Mismatch

**Date Identified:** 2026-08-12  
**Severity:** P1 (Blocks Test Execution)  
**Type:** Test Infrastructure Bug

**Problem:**
Jest's `testPathIgnorePatterns` was configured to exclude `<rootDir>/tests/e2e/` but Playwright tests were located in `<rootDir>/src/__tests__/e2e/`, causing Jest to attempt loading Playwright test files.

**Symptoms:**
```
TypeError: Class extends value undefined is not a constructor or null
  at Object.<anonymous> (src/__tests__/e2e/ai.spec.ts:5:15)
```
12 Playwright test suites failed when running `npm test`.

**Root Cause:**
Playwright test files use `@playwright/test` which exports a different `test` function than Jest. When Jest tries to load these files, it fails because the Playwright runtime isn't available in Jest's environment.

**Fix Applied:**
Updated `frontend/jest.config.ts`:
```typescript
testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/src/__tests__/e2e/']
```

**Verification:**
All 58 Jest tests now pass cleanly without attempting to load Playwright specs.

**Commit:** 059b0e4

---

### RC-002: API Response Wrapper Mismatch

**Date Identified:** 2026-08-12 (by previous agent)  
**Severity:** P0 (Breaks AI Chat Feature)  
**Type:** Application Bug (Frontend/Backend Integration)

**Problem:**
Frontend API clients (`ai.api.ts`, `chat.api.ts`) expected direct response data, but Spring Boot backend returns all responses wrapped in `ApiResponse<T>` structure:
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

**Affected Endpoints:**
- `POST /api/ai/chat` → Returns `ApiResponse<AiChatResponse>`
- `GET /api/ai/chat/history` → Returns `ApiResponse<List<ChatHistory>>`

**Backend Response DTOs:**
- `AiChatResponse` has fields: `reply`, `sessionId`, `timestamp`
- `ChatHistory` entity has fields: `message` (not `content`), `createdAt` (not `timestamp`)

**Symptoms:**
- AI chat feature would fail to extract response text
- Chat history would fail to load
- Frontend expected `response.data.reply` but got `response.data` directly

**Fix Applied:**
Added response unwrapping and field mapping in both files:
```typescript
// ai.api.ts
const responseData = response.data?.data || response.data;
return {
  response: responseData.reply || '',
  sessionId: responseData.sessionId || sessionId || 'temp',
};

// For history:
const rawHistory = response.data?.data || [];
return rawHistory.map((item: any) => ({
  id: item.id || String(Math.random()),
  role: item.role,
  content: item.message || '',          // Backend field: message
  sessionId: item.sessionId || sessionId,
  timestamp: item.createdAt || new Date().toISOString(), // Backend field: createdAt
}));
```

**Verification:**
- Inspected backend `AiAssistantController.java` - confirms `ApiResponse<T>` wrapper
- Inspected backend `ChatHistory.java` entity - confirms field names
- Fix correctly unwraps `data` property and maps field names

**Testing Status:**
Requires E2E Playwright tests with live backend to verify end-to-end functionality.

**Commit:** 059b0e4

---

### RC-003: Placeholder Test Quality Issue

**Date Identified:** 2026-08-12  
**Severity:** P2 (Test Quality)  
**Type:** Test Bug (Violates Meaningful Test Requirement)

**Problem:**
`general.spec.ts` contains 120 programmatically generated "tests" (SEL-181 to SEL-300) that all perform identical actions:
```typescript
for (let i = 181; i <= 300; i++) {
  test(`SEL-${i}: Interactive visual component checklist - State validation index ${i}`, async ({ page }) => {
    await page.goto('/');
    const isVisible = await page.locator('html').isVisible();
    expect(isVisible).toBeTruthy();
  });
}
```

**Impact:**
- These tests provide NO additional coverage
- They artificially inflate test counts
- They waste CI/CD time (120 duplicate test executions)
- They violate the "300 test quality rule" (each test must be meaningful)

**Actual Playwright Test Count:**
- Total Playwright tests: 165
- Meaningful tests: **45** (165 - 120 placeholders)
- Placeholder tests: **120** (need replacement)

**Recommended Fix:**
Replace SEL-181 to SEL-300 with meaningful tests covering:
- Different routes (/dashboard, /subjects, /exams, /timetable, /materials, /chat, /performance, /settings)
- Actual UI interactions (button clicks, form submissions, data displays)
- Error handling (network failures, validation errors)
- Edge cases (empty states, loading states, offline behavior)
- Accessibility checks (ARIA labels, keyboard navigation)
- Responsive behavior verification (not just viewport scaling)

**Status:** ⚠️ IDENTIFIED - Not fixed (requires design and implementation of 120 meaningful tests)
