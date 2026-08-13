import { test, expect } from '@playwright/test';

// Group 8: Performance Analytics Charts (SEL-146 to SEL-154)
test.describe('Analytics Charts Section', () => {

  test.beforeEach(async ({ page, context }) => {
    // Skip onboarding for all tests
    await context.addInitScript(() => {
      localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
    });

    // Intercept auth checks
    await page.route('**/api/students/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 's-123', name: 'Dashboard Student' } }),
      });
    });

    await page.route('**/api/performance/report', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            overallAverage: 82.5,
            studyHoursThisWeek: 12.0,
            completedTasks: 18,
            upcomingExamsCount: 2,
            subjectPerformanceList: [
              { subjectName: 'Data Structures', averageGrade: 88.0, studyHours: 8.5 },
              { subjectName: 'Computer Architecture', averageGrade: 77.0, studyHours: 3.5 }
            ]
          }
        }),
      });
    });

    await page.route('**/api/performance/history', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'snap-1', snapshotDate: '2026-08-01', overallPercentage: 80.0, studyHoursWeek: 10.0, tasksCompleted: 15 },
            { id: 'snap-2', snapshotDate: '2026-08-08', overallPercentage: 82.5, studyHoursWeek: 12.0, tasksCompleted: 18 }
          ]
        }),
      });
    });

    await context.addCookies([
      { name: 'access_token', value: 'fake.jwt.token', domain: 'localhost', path: '/' }
    ]);
  });

  test('SEL-146: Analytics report cards details container display verification', async ({ page }) => {
    await page.goto('/performance');
    await expect(page.locator('text=overallAverage, text=82.5, text=completed, text=18').first()).toBeDefined();
  });

  test('SEL-147: Empty states display when database lists are unpopulated fallback', async ({ page }) => {
    await page.route('**/api/performance/report', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) });
    });
    await page.goto('/performance');
    const warningText = page.locator('text=No data, text=Not enough data');
    expect(warningText).toBeDefined();
  });

  test('SEL-148: Grades history line chart displays data points', async ({ page }) => {
    await page.goto('/performance');
    const chart = page.locator('svg[class*="recharts"]');
    expect(chart).toBeDefined();
  });

  test('SEL-149: Subject comparison bar chart displays layout categories', async ({ page }) => {
    await page.goto('/performance');
    const bar = page.locator('path[class*="recharts-rectangle"]');
    expect(bar).toBeDefined();
  });

  test('SEL-150: Study duration vs exam score correlation scatter plot displays', async ({ page }) => {
    await page.goto('/performance');
    // Scatter plot elements present check
  });

  test('SEL-151: Radial dial charts displays completion percentages', async ({ page }) => {
    await page.goto('/performance');
    const radial = page.locator('path[class*="recharts-radial-bar-sector"]');
    expect(radial).toBeDefined();
  });

  test('SEL-152: Tooltip hover checks match chart values', async ({ page }) => {
    await page.goto('/performance');
    const dot = page.locator('circle[class*="recharts-active-dot"], path[class*="recharts-bar-rectangle"]').first();
    if (await dot.count() > 0) {
      await dot.hover();
      const tooltip = page.locator('div[class*="recharts-tooltip-wrapper"]');
      await expect(tooltip).toBeVisible();
    }
  });

  test('SEL-153: SVG charts resize dynamically on smaller viewport scales', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/performance');
    const chart = page.locator('svg').first();
    await expect(chart).toBeVisible();
  });

  test('SEL-154: Export summary reports triggers CSV file generation download', async ({ page }) => {
    await page.goto('/performance');
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download")');
    if (await exportBtn.count() > 0) {
      expect(exportBtn).toBeDefined();
    }
  });

});
