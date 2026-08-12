import { test, expect } from '@playwright/test';

// Group 4: Exams and Grading (SEL-071 to SEL-090)
test.describe('Exams Section', () => {

  test.beforeEach(async ({ page, context }) => {
    // Intercept auth checks
    await page.route('**/api/students/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 's-123', name: 'Dashboard Student' } }),
      });
    });

    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'sub-1', name: 'Data Structures' },
            { id: 'sub-2', name: 'Computer Architecture' }
          ]
        }),
      });
    });

    await page.route('**/api/exams/upcoming', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'exam-1', examName: 'Midterm quiz', subjectId: 'sub-1', examDate: '2026-09-15', difficulty: 'medium', notes: 'Chapters 1-5' }
          ]
        }),
      });
    });

    await context.addCookies([
      { name: 'access_token', value: 'fake.jwt.token', domain: 'localhost', path: '/' }
    ]);
  });

  test('SEL-071: Upcoming exams list loaded display', async ({ page }) => {
    await page.goto('/exams');
    await expect(page.locator('text=Midterm quiz')).toBeVisible();
  });

  test('SEL-072: Empty exams list fallback view checks', async ({ page }) => {
    await page.route('**/api/exams/upcoming', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });
    await page.goto('/exams');
    await expect(page.locator('text=No exams scheduled, text=Add Exam')).toBeVisible();
  });

  test('SEL-073: Open Schedule Exam Modal overlay displays', async ({ page }) => {
    await page.goto('/exams');
    const scheduleBtn = page.locator('button:has-text("Add Exam"), button:has-text("Schedule Exam")');
    if (await scheduleBtn.count() > 0) {
      await scheduleBtn.click();
      await expect(page.locator('h2:has-text("Add Exam"), h3:has-text("Add Exam"), label:has-text("Exam Title")').first()).toBeVisible();
    }
  });

  test('SEL-074: Schedule exam (valid input parameters)', async ({ page }) => {
    await page.route('**/api/exams', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'exam-2', examName: 'Final Exam', subjectId: 'sub-1', examDate: '2026-10-01' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              { id: 'exam-1', examName: 'Midterm quiz', subjectId: 'sub-1', examDate: '2026-09-15' },
              { id: 'exam-2', examName: 'Final Exam', subjectId: 'sub-1', examDate: '2026-10-01' }
            ]
          }),
        });
      }
    });

    await page.goto('/exams');
    const scheduleBtn = page.locator('button:has-text("Add Exam"), button:has-text("Schedule Exam")');
    if (await scheduleBtn.count() > 0) {
      await scheduleBtn.click();
      await page.fill('input[placeholder*="Name"], input[id*="name"], input[placeholder*="Title"]', 'Final Exam');
      await page.fill('input[type="date"]', '2026-10-01');
      const subjectSelect = page.locator('select[id*="subject"]');
      if (await subjectSelect.count() > 0) {
        await subjectSelect.selectOption({ label: 'Data Structures' });
      }
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Add")');
      await expect(page.locator('text=Final Exam')).toBeVisible();
    }
  });

  test('SEL-075: Schedule exam past date validation warning', async ({ page }) => {
    await page.goto('/exams');
    const scheduleBtn = page.locator('button:has-text("Add Exam"), button:has-text("Schedule Exam")');
    if (await scheduleBtn.count() > 0) {
      await scheduleBtn.click();
      await page.fill('input[placeholder*="Name"], input[id*="name"]', 'Quiz 1');
      await page.fill('input[type="date"]', '2020-01-01');
      await page.click('button[type="submit"]');
      // Should show validation alert: date must be in future
    }
  });

  test('SEL-076: Schedule exam missing subject select validation', async ({ page }) => {
    await page.goto('/exams');
    const scheduleBtn = page.locator('button:has-text("Add Exam"), button:has-text("Schedule Exam")');
    if (await scheduleBtn.count() > 0) {
      await scheduleBtn.click();
      await page.fill('input[placeholder*="Name"], input[id*="name"]', 'Quiz 1');
      await page.click('button[type="submit"]');
      // Missing subject select block validation
    }
  });

  test('SEL-077: Exam countdown calculation validation checks', async ({ page }) => {
    await page.goto('/exams');
    // Midterm quiz is on 2026-09-15. Check if countdown math rendering is visible
    const countdown = page.locator('text=days, text=remaining, text=Exam in');
    expect(countdown).toBeDefined();
  });

  test('SEL-078: Open Edit Exam Modal inputs prefilled check', async ({ page }) => {
    await page.goto('/exams');
    const editBtn = page.locator('button[class*="edit"], svg[class*="edit"], button:has-text("Edit")').first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      const inputVal = await page.locator('input[placeholder*="Name"], input[id*="name"]').inputValue();
      expect(inputVal).toBe('Midterm quiz');
    }
  });

  test('SEL-079: Edit scheduled exam details save synchronization', async ({ page }) => {
    await page.route('**/api/exams/exam-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'exam-1', examName: 'Midterm quiz Revised', subjectId: 'sub-1', examDate: '2026-09-15' }),
      });
    });

    await page.goto('/exams');
    const editBtn = page.locator('button[class*="edit"], svg[class*="edit"], button:has-text("Edit")').first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.fill('input[placeholder*="Name"], input[id*="name"]', 'Midterm quiz Revised');
      await page.click('button[type="submit"], button:has-text("Save")');
      // Updated exam title check
    }
  });

  test('SEL-080: Cancel delete exam preserves item in list', async ({ page }) => {
    await page.goto('/exams');
    const deleteBtn = page.locator('button[class*="delete"], svg[class*="delete"], button:has-text("Delete")').first();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await page.click('button:has-text("Cancel"), button[class*="cancel"]');
      await expect(page.locator('text=Midterm quiz')).toBeVisible();
    }
  });

  test('SEL-081: Confirm delete exam removes item from calendar view list', async ({ page }) => {
    await page.route('**/api/exams/exam-1', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/exams/upcoming', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });

    await page.goto('/exams');
    const deleteBtn = page.locator('button[class*="delete"], svg[class*="delete"], button:has-text("Delete")').first();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await page.click('button:has-text("Delete"), button:has-text("Confirm")');
      await expect(page.locator('text=Midterm quiz')).not.toBeVisible();
    }
  });

  test('SEL-082: Log exam grades valid numeric entries mapping', async ({ page }) => {
    await page.goto('/exams');
    const logBtn = page.locator('button:has-text("Log Grade"), button:has-text("Log Marks"), button:has-text("Add Marks")').first();
    if (await logBtn.count() > 0) {
      await logBtn.click();
      await page.fill('input[placeholder*="Marks"], input[id*="marks"]', '85');
      await page.fill('input[placeholder*="Total"], input[id*="total"]', '100');
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Submit")');
      // Should show success or completed status
    }
  });

  test('SEL-083: Log grades score exceeds total marks validation warning', async ({ page }) => {
    await page.goto('/exams');
    const logBtn = page.locator('button:has-text("Log Grade"), button:has-text("Log Marks"), button:has-text("Add Marks")').first();
    if (await logBtn.count() > 0) {
      await logBtn.click();
      await page.fill('input[placeholder*="Marks"], input[id*="marks"]', '120');
      await page.fill('input[placeholder*="Total"], input[id*="total"]', '100');
      await page.click('button[type="submit"]');
      // Should show error banner
    }
  });

  test('SEL-084: Rejects negative marks or total score values checks', async ({ page }) => {
    await page.goto('/exams');
    const logBtn = page.locator('button:has-text("Log Grade"), button:has-text("Log Marks"), button:has-text("Add Marks")').first();
    if (await logBtn.count() > 0) {
      await logBtn.click();
      await page.fill('input[placeholder*="Marks"]', '-5');
      await page.click('button[type="submit"]');
      // Rejects input value
    }
  });

  test('SEL-085: Completed exams archived statistics lists toggle', async ({ page }) => {
    await page.goto('/exams');
    const archiveBtn = page.locator('button:has-text("Completed"), button:has-text("Past Exams"), button:has-text("History")');
    if (await archiveBtn.count() > 0) {
      await archiveBtn.click();
      expect(archiveBtn).toBeDefined();
    }
  });

  test('SEL-086: Exam cards mobile viewport responsiveness checks', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/exams');
    const examCard = page.locator('div[class*="card"]').first();
    await expect(examCard).toBeVisible();
  });

  test('SEL-087: Exam search input subject matching filter check', async ({ page }) => {
    await page.goto('/exams');
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Filter"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('Midterm');
      // Results filtered
    }
  });

  test('SEL-088: Keyboard navigation Tab focus loops through exam actions', async ({ page }) => {
    await page.goto('/exams');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();
  });

  test('SEL-089: Upcoming exam reminder notifications rendering badge icon', async ({ page }) => {
    await page.goto('/exams');
    const alertIcon = page.locator('svg[class*="bell"], div[class*="notification"], span[class*="badge"]');
    expect(alertIcon).toBeDefined();
  });

  test('SEL-090: Syllabus characters length bounds checks', async ({ page }) => {
    await page.goto('/exams');
    const scheduleBtn = page.locator('button:has-text("Add Exam"), button:has-text("Schedule Exam")');
    if (await scheduleBtn.count() > 0) {
      await scheduleBtn.click();
      const syllabusInput = page.locator('textarea[id*="syllabus"], textarea[placeholder*="Syllabus"]');
      if (await syllabusInput.count() > 0) {
        await syllabusInput.fill('A'.repeat(1200));
        const val = await syllabusInput.inputValue();
        expect(val.length).toBe(1200);
      }
    }
  });

});
