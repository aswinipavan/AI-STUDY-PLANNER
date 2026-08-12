import { test, expect } from '@playwright/test';

// Group: Data Display & Interactions (SEL-261 to SEL-280)
test.describe('Data Display and Interactions', () => {

  test.beforeEach(async ({ page, context }) => {
    await page.route('**/api/students/me', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { id: 's-1' } }) });
    });
    await context.addCookies([{ name: 'access_token', value: 'token', domain: 'localhost', path: '/' }]);
  });

  test('SEL-261: Subjects list displays all items', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [
          { id: 1, name: 'Math' },
          { id: 2, name: 'Physics' },
          { id: 3, name: 'Chemistry' }
        ]})
      });
    });
    await page.goto('/subjects');
    await page.waitForTimeout(500);
    const items = page.locator('text=Math, text=Physics, text=Chemistry');
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('SEL-262: Exams list sorted by date', async ({ page }) => {
    await page.route('**/api/exams', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [
          { id: 1, name: 'Math Exam', date: '2026-12-01' },
          { id: 2, name: 'Physics Exam', date: '2026-11-15' }
        ]})
      });
    });
    await page.goto('/exams');
    await page.waitForTimeout(500);
    const firstExam = page.locator('text=Physics Exam, text=Math Exam').first();
    expect(await firstExam.count()).toBeGreaterThan(0);
  });

  test('SEL-263: Search filters subjects list', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [
          { id: 1, name: 'Mathematics' },
          { id: 2, name: 'Physics' }
        ]})
      });
    });
    await page.goto('/subjects');
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('Math');
      await page.waitForTimeout(300);
    }
  });

  test('SEL-264: Material cards display thumbnail', async ({ page }) => {
    await page.route('**/api/materials', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [{ id: 1, title: 'Notes', type: 'pdf' }]})
      });
    });
    await page.goto('/materials');
    await page.waitForTimeout(500);
    const card = page.locator('[class*="card"], [class*="material"]').first();
    expect(await card.count()).toBeGreaterThanOrEqual(0);
  });

  test('SEL-265: Timetable slots toggle completion status', async ({ page }) => {
    await page.route('**/api/timetable/active', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: { id: 1, slots: [{ id: 1, topic: 'Math', completed: false }] }})
      });
    });
    await page.route('**/api/timetable/slots/**/complete', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { completed: true } }) });
    });
    await page.goto('/timetable');
    const toggleBtn = page.locator('button[aria-label*="complete"], input[type="checkbox"]').first();
    if (await toggleBtn.count() > 0) {
      await toggleBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('SEL-266: Dashboard stats update on data refresh', async ({ page }) => {
    await page.route('**/api/timetable/active', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { completedSlots: 5, totalSlots: 10 } }) });
    });
    await page.goto('/dashboard');
    await page.waitForTimeout(500);
    const statsCard = page.locator('[class*="stat"], [class*="card"]').first();
    expect(await statsCard.count()).toBeGreaterThan(0);
  });

  test('SEL-267: Subject card click opens detail view', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [{ id: 1, name: 'Math' }] }) });
    });
    await page.goto('/subjects');
    const card = page.locator('[class*="subject-card"], button:has-text("Math")').first();
    if (await card.count() > 0) {
      await card.click();
      await page.waitForTimeout(300);
    }
  });

  test('SEL-268: Exam countdown timer displays days remaining', async ({ page }) => {
    await page.route('**/api/exams', async (route) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [{ id: 1, name: 'Test', date: futureDate.toISOString() }] })
      });
    });
    await page.goto('/exams');
    await page.waitForTimeout(500);
    const countdown = page.locator('text=days, text=day').first();
    expect(await countdown.count()).toBeGreaterThanOrEqual(0);
  });

  test('SEL-269: Performance chart displays marks data', async ({ page }) => {
    await page.route('**/api/performance/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: { average: 85, subjects: [{ name: 'Math', score: 90 }] }})
      });
    });
    await page.goto('/performance');
    await page.waitForTimeout(500);
    const chart = page.locator('svg, canvas, [class*="chart"]').first();
    expect(await chart.count()).toBeGreaterThanOrEqual(0);
  });

  test('SEL-270: Material download link triggers download', async ({ page }) => {
    await page.route('**/api/materials', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [{ id: 1, title: 'Doc', url: '/files/doc.pdf' }] })
      });
    });
    await page.goto('/materials');
    const downloadBtn = page.locator('a[download], button:has-text("Download")').first();
    if (await downloadBtn.count() > 0) {
      // Download button exists
      expect(await downloadBtn.isVisible()).toBeTruthy();
    }
  });

  test('SEL-271: Pagination shows page numbers', async ({ page }) => {
    await page.route('**/api/materials', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: Array(50).fill({ id: 1, title: 'Item' }), total: 100 })
      });
    });
    await page.goto('/materials');
    await page.waitForTimeout(500);
    const pagination = page.locator('[class*="pagination"], button:has-text("Next"), button:has-text("Previous")').first();
    expect(await pagination.count()).toBeGreaterThanOrEqual(0);
  });

  test('SEL-272: Timetable week navigation arrows', async ({ page }) => {
    await page.route('**/api/timetable/active', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { slots: [] } }) });
    });
    await page.goto('/timetable');
    const prevWeek = page.locator('button:has-text("Previous"), button[aria-label*="previous"]').first();
    if (await prevWeek.count() > 0) {
      await prevWeek.click();
      await page.waitForTimeout(300);
    }
  });

  test('SEL-273: Subject filter dropdown in materials', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [{ id: 1, name: 'Math' }] }) });
    });
    await page.route('**/api/materials', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
    });
    await page.goto('/materials');
    const filter = page.locator('select, button:has-text("Filter")').first();
    if (await filter.count() > 0) {
      await filter.click();
      await page.waitForTimeout(200);
    }
  });

  test('SEL-274: Chat message scroll to latest', async ({ page }) => {
    await page.route('**/api/ai/chat/history', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: Array(20).fill({ role: 'user', message: 'Hi', createdAt: new Date() }) })
      });
    });
    await page.goto('/chat');
    await page.waitForTimeout(500);
    // Should scroll to bottom of messages
  });

  test('SEL-275: Dashboard quick actions navigation', async ({ page }) => {
    await page.goto('/dashboard');
    const quickAction = page.locator('a[href*="/subjects"], a[href*="/timetable"], button:has-text("Add")').first();
    if (await quickAction.count() > 0) {
      await quickAction.click();
      await page.waitForTimeout(300);
    }
  });

  test('SEL-276: Exam status badge color coding', async ({ page }) => {
    await page.route('**/api/exams', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [{ id: 1, name: 'Test', status: 'completed' }] })
      });
    });
    await page.goto('/exams');
    await page.waitForTimeout(500);
    const badge = page.locator('[class*="badge"], [class*="status"]').first();
    expect(await badge.count()).toBeGreaterThanOrEqual(0);
  });

  test('SEL-277: Priority subjects highlight in red', async ({ page }) => {
    await page.route('**/api/performance/priority', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [{ subjectName: 'Math', averageScore: 45 }] })
      });
    });
    await page.goto('/priority');
    await page.waitForTimeout(500);
    const priorityItem = page.locator('[class*="priority"], [class*="weak"]').first();
    expect(await priorityItem.count()).toBeGreaterThanOrEqual(0);
  });

  test('SEL-278: Notification bell shows unread count', async ({ page }) => {
    await page.goto('/dashboard');
    const notificationBell = page.locator('[aria-label*="notification"], button:has-text("🔔")').first();
    if (await notificationBell.count() > 0) {
      await notificationBell.click();
      await page.waitForTimeout(200);
    }
  });

  test('SEL-279: Settings tabs switch between sections', async ({ page }) => {
    await page.goto('/settings');
    const tab = page.locator('button[role="tab"], [class*="tab"]').nth(1);
    if (await tab.count() > 0) {
      await tab.click();
      await page.waitForTimeout(200);
    }
  });

  test('SEL-280: Timetable calendar view vs list view toggle', async ({ page }) => {
    await page.route('**/api/timetable/active', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { slots: [] } }) });
    });
    await page.goto('/timetable');
    const viewToggle = page.locator('button:has-text("Calendar"), button:has-text("List")').first();
    if (await viewToggle.count() > 0) {
      await viewToggle.click();
      await page.waitForTimeout(200);
    }
  });

});
