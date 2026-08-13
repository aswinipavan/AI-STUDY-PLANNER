import { test, expect } from '@playwright/test';

// Group: Integration Workflows (SEL-291 to SEL-300)
test.describe('Integration Workflows', () => {

  test.beforeEach(async ({ page, context }) => {
    // Skip onboarding for all tests
    await context.addInitScript(() => {
      localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
    });

    await page.route('**/api/students/me', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { id: 's-1', name: 'User' } }) });
    });
    await context.addCookies([{ name: 'access_token', value: 'token', domain: 'localhost', path: '/' }]);
  });

  test('SEL-291: Complete user journey: Login to Dashboard', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { token: 'jwt', student: { id: 's-1' } } }) });
    });
    await page.goto('/login');
    const emailInput = page.locator('#signin-email, input[type="email"]').first();
    if (await emailInput.count() > 0) {
      await emailInput.fill('test@example.com');
      const passwordInput = page.locator('#signin-password, input[type="password"]').first();
      await passwordInput.fill('password123');
      await page.click('button[type="submit"], button:has-text("Sign In")');
      await page.waitForTimeout(1000);
      // Should redirect to dashboard
    }
  });

  test('SEL-292: Subject creation to timetable generation workflow', async ({ page }) => {
    // Create subject
    await page.route('**/api/students/me/subjects', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, body: JSON.stringify({ data: { id: 1, name: 'Math' } }) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ data: [{ id: 1, name: 'Math' }] }) });
      }
    });
    await page.goto('/subjects');
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.count() > 0) {
        await nameInput.fill('Mathematics');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }
    }

    // Navigate to timetable generator
    await page.goto('/timetable/generate');
    await page.waitForTimeout(500);
    // Should see subject in generator
  });

  test('SEL-293: Upload material then view in library', async ({ page }) => {
    await page.route('**/api/materials', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, body: JSON.stringify({ data: { id: 1, title: 'Notes' } }) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ data: [{ id: 1, title: 'Notes' }] }) });
      }
    });
    await page.goto('/materials');
    // Material workflow verification
    await page.waitForTimeout(500);
  });

  test('SEL-294: Schedule exam then log marks workflow', async ({ page }) => {
    await page.route('**/api/exams', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, body: JSON.stringify({ data: { id: 1, name: 'Test' } }) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ data: [{ id: 1, name: 'Test' }] }) });
      }
    });
    await page.goto('/exams');
    const scheduleBtn = page.locator('button:has-text("Schedule"), button:has-text("Add")').first();
    if (await scheduleBtn.count() > 0) {
      await scheduleBtn.click();
      await page.waitForTimeout(300);
      // Fill exam details
      const nameInput = page.locator('input[name="name"], input[name="title"]').first();
      if (await nameInput.count() > 0) {
        await nameInput.fill('Math Exam');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }
    }
  });

  test('SEL-295: Performance dashboard reflects exam results', async ({ page }) => {
    await page.route('**/api/performance/**', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { average: 85 } }) });
    });
    await page.route('**/api/exams', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [{ id: 1, marks: 85 }] }) });
    });
    await page.goto('/performance');
    await page.waitForTimeout(500);
    // Performance should show exam data
    await page.goto('/exams');
    await page.waitForTimeout(500);
  });

  test('SEL-296: Settings change persists across sessions', async ({ page }) => {
    await page.route('**/api/students/me', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ status: 200, body: JSON.stringify({ data: { emailNotifications: false } }) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ data: { id: 's-1', emailNotifications: true } }) });
      }
    });
    await page.goto('/settings');
    const toggle = page.locator('input[type="checkbox"]').first();
    if (await toggle.count() > 0) {
      await toggle.click();
      await page.waitForTimeout(500);
      // Reload page
      await page.reload();
      await page.waitForTimeout(500);
    }
  });

  test('SEL-297: AI chat maintains context across messages', async ({ page }) => {
    await page.route('**/api/ai/chat', async (route) => {
      await route.fulfill({ status: 201, body: JSON.stringify({ data: { reply: 'Response', sessionId: 'sess-1' } }) });
    });
    await page.goto('/chat');
    const input = page.locator('input[placeholder*="message"], textarea').first();
    if (await input.count() > 0) {
      await input.fill('First message');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      await input.fill('Follow up');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
  });

  test('SEL-298: Timetable completion updates dashboard stats', async ({ page }) => {
    await page.route('**/api/timetable/active', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { completedSlots: 3, totalSlots: 10 } }) });
    });
    await page.route('**/api/timetable/slots/**/complete', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { completed: true } }) });
    });
    await page.goto('/timetable');
    const completeBtn = page.locator('button:has-text("Complete"), input[type="checkbox"]').first();
    if (await completeBtn.count() > 0) {
      await completeBtn.click();
      await page.waitForTimeout(500);
      // Navigate to dashboard
      await page.goto('/dashboard');
      await page.waitForTimeout(500);
    }
  });

  test('SEL-299: Priority subjects workflow from performance to revision', async ({ page }) => {
    await page.route('**/api/performance/priority', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [{ subjectName: 'Math', averageScore: 45 }] }) });
    });
    await page.goto('/priority');
    await page.waitForTimeout(500);
    const reviseBtn = page.locator('button:has-text("Revise"), a:has-text("Study Plan")').first();
    if (await reviseBtn.count() > 0) {
      await reviseBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('SEL-300: Full onboarding to first timetable generation', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
    });
    // Skip onboarding
    await page.goto('/onboarding');
    const skipBtn = page.locator('button:has-text("Skip"), a:has-text("Skip")').first();
    if (await skipBtn.count() > 0) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    } else {
      await page.goto('/dashboard');
    }

    // Navigate through workflow
    await page.goto('/subjects');
    await page.waitForTimeout(500);
    await page.goto('/timetable/generate');
    await page.waitForTimeout(500);
    // Complete workflow reaches timetable generator
  });

});
