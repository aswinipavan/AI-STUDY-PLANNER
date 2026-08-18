# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live_production_sub_audit.spec.ts >> Live Production Subscription Pricing Tier Audit >> Audit 3b: Production Subscription Dashboard Pricing Tiers
- Location: src\__tests__\e2e\live_production_sub_audit.spec.ts:10:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1, h2').filter({ hasText: /Subscription|Pricing|Plans/i }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('h1, h2').filter({ hasText: /Subscription|Pricing|Plans/i }).first()

```

```yaml
- alert
- navigation "Main navigation":
  - link "StudyPlanner":
    - /url: /dashboard
  - navigation:
    - paragraph: Main
    - link "Dashboard":
      - /url: /dashboard
    - link "Subjects":
      - /url: /subjects
    - link "Timetable AI":
      - /url: /timetable
    - link "Exams":
      - /url: /exams
    - link "Materials":
      - /url: /materials
    - paragraph: AI Features
    - link "AI Tutor AI":
      - /url: /chat
    - link "Performance AI":
      - /url: /performance
    - paragraph: Account
    - link "Settings":
      - /url: /settings
  - text: U
  - paragraph: Student
  - text: Free Plan
  - link "Settings":
    - /url: /settings
- banner:
  - button "Switch to dark mode"
  - button "Notifications"
  - button "Profile menu": U
- main:
  - text: Go Premium
  - heading "Unlock Your Full Potential" [level=1]
  - paragraph: Get AI-powered study plans, unlimited resources, and deep performance analytics.
  - heading "Monthly" [level=3]
  - paragraph: Perfect for exam season
  - text: ₹299 /month
  - list:
    - listitem: AI Chat Assistant
    - listitem: Unlimited Materials
    - listitem: Performance Analytics
    - listitem: Priority Study Plans
  - button "Subscribe Monthly"
  - text: BEST VALUE
  - heading "Yearly" [level=3]
  - paragraph: Best value — 44% off
  - text: ₹1,999 /year
  - list:
    - listitem: Everything in Monthly
    - listitem: Advanced AI Insights
    - listitem: Export Reports
    - listitem: Early Access Features
  - button "Subscribe Yearly"
  - paragraph: 🔒 All payments are 100% secure. Signature verification is handled server-side. We never store card details.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import * as path from 'path';
  3  | 
  4  | const PROD_URL = 'https://ai-study-planner-jhh9.vercel.app';
  5  | const ARTIFACTS_DIR = 'C:\\Users\\aswin\\.gemini\\antigravity-ide\\brain\\d97198a9-f775-44b6-846e-fb6f36081fb1';
  6  | const VALID_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJlbWFpbCI6ImFzd2luaXBhd2FuODZAZ21haWwuY29tIiwiaWF0IjoxNzgxNTEwOTUxLCJleHAiOjIwOTcwODY5NTF9.ZlQ1_JVTGyglYJuOm2w6BdWSCqEI749Xtsfad7QpvIY';
  7  | 
  8  | test.describe('Live Production Subscription Pricing Tier Audit', () => {
  9  | 
  10 |   test('Audit 3b: Production Subscription Dashboard Pricing Tiers', async ({ page, context }) => {
  11 |     await context.addInitScript(() => {
  12 |       localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
  13 |       localStorage.setItem('studyplanner_onboarding_completed', 'true');
  14 |       localStorage.setItem('auth-storage', JSON.stringify({
  15 |         state: {
  16 |           user: {
  17 |             id: '123e4567-e89b-12d3-a456-426614174000',
  18 |             name: 'Aswini Pavan',
  19 |             email: 'aswinipavan86@gmail.com',
  20 |             collegeName: 'NIT',
  21 |             department: 'CSE',
  22 |             semester: '6th Semester',
  23 |             isPremium: false,
  24 |           },
  25 |           token: VALID_JWT,
  26 |         },
  27 |         version: 0,
  28 |       }));
  29 |     });
  30 | 
  31 |     await context.addCookies([
  32 |       { name: 'access_token', value: VALID_JWT, domain: 'ai-study-planner-jhh9.vercel.app', path: '/' }
  33 |     ]);
  34 | 
  35 |     const subUrl = `${PROD_URL}/subscription`;
  36 |     console.log(`[PROD AUDIT] Navigating authenticated to ${subUrl}...`);
  37 |     const response = await page.goto(subUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  38 |     await page.waitForTimeout(1000);
  39 | 
  40 |     expect(response?.status()).toBe(200);
  41 | 
  42 |     const heading = page.locator('h1, h2', { hasText: /Subscription|Pricing|Plans/i }).first();
> 43 |     await expect(heading).toBeVisible();
     |                           ^ Error: expect(locator).toBeVisible() failed
  44 | 
  45 |     const screenshotPath = path.join(ARTIFACTS_DIR, 'production_subscription_authenticated_live.png');
  46 |     await page.screenshot({ path: screenshotPath, fullPage: false });
  47 |     console.log(`[PROD AUDIT] Saved authenticated subscription screenshot to ${screenshotPath}`);
  48 |   });
  49 | 
  50 | });
  51 | 
```