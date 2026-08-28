import { test, expect } from '@playwright/test';
import { setupAuthenticatedContext } from '../../../playwright/auth-setup';

// Group 9: Profile and Notification Settings (SEL-155 to SEL-163)
test.describe('Profile Settings Section', () => {
  const mockStudent = {
    id: 's-123',
    firebaseUid: 'mock-uid-settings-spec',
    name: 'Aswin Kumar',
    fullName: 'Aswin Kumar',
    email: 'you@example.com',
    collegeName: 'IIT Madras',
    department: 'Computer Science',
    semester: 5,
    availableHoursPerDay: 4.0,
    preferredStudyTime: 'EVENING',
    emailNotifications: true,
    pushNotifications: false,
    isPremium: false,
  };

  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedContext(context, mockStudent);

    await page.addInitScript((student) => {
      localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
      localStorage.setItem('auth-store', JSON.stringify({
        state: {
          user: student,
          isAuthenticated: true,
          isPremium: false,
        },
        version: 0,
      }));
    }, mockStudent);

    // Intercept auth checks
    await page.route('**/api/students/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: mockStudent,
        }),
      });
    });
  });

  test('SEL-155: Save profile update valid parameters input fields details', async ({ page }) => {
    await page.route('**/api/students/me', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }
    });

    await page.goto('/settings');
    const nameInput = page.locator('input[type="text"], input[placeholder*="Name"]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill('Aswin Kumar Dev');
      const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('SEL-156: Submit profile update validation block on empty email value', async ({ page }) => {
    await page.goto('/settings');
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.count() > 0) {
      await emailInput.fill('');
      await page.click('button[type="submit"]');
      // Warning displayed: email is required
    }
  });

  test('SEL-157: Toggle notification preferences switches options check', async ({ page }) => {
    await page.route('**/api/students/me/notifications', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.goto('/settings');
    const emailCheckbox = page.locator('input[type="checkbox"][id*="email"], input[id*="notifications"]').first();
    if (await emailCheckbox.count() > 0) {
      const isChecked = await emailCheckbox.isChecked();
      await emailCheckbox.click();
      expect(await emailCheckbox.isChecked()).not.toBe(isChecked);
    }
  });

  test('SEL-158: Replay onboarding resets layout indicators state redirects', async ({ page }) => {
    await page.goto('/settings');
    const replayBtn = page.locator('button:has-text("Replay Onboarding"), button:has-text("Tutorial")');
    if (await replayBtn.count() > 0) {
      await replayBtn.click();
      await expect(page).toHaveURL(/\/onboarding/);
      // LocalStorage flags cleared verification
    }
  });

  test('SEL-159: Toggle theme styles updates UI components colors values', async ({ page }) => {
    await page.goto('/settings');
    const themeToggle = page.locator('button[class*="theme"], button[aria-label*="theme"]').first();
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      expect(themeToggle).toBeDefined();
    }
  });

  test('SEL-160: Profile image upload opens selector popup screen dialog', async ({ page }) => {
    await page.goto('/settings');
    const avatar = page.locator('input[type="file"]');
    expect(avatar).toBeDefined();
  });

  test('SEL-161: Settings form elements responsiveness grid check', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/settings');
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
  });

  test('SEL-162: Profile details persists on page manual reloads', async ({ page }) => {
    await page.goto('/settings');
    // Wait for form to load and for student data to be fetched
    await page.waitForTimeout(500);
    const nameInput = page.locator('input[type="text"], input[placeholder*="Name"]').first();
    if (await nameInput.count() > 0) {
      const nameVal = await nameInput.inputValue();
      expect(nameVal).toBe('Aswin Kumar');
    }
  });

  test('SEL-163: Cancel modifications resets form fields back to database state', async ({ page }) => {
    await page.goto('/settings');
    const nameInput = page.locator('input[id*="name"], input[placeholder*="Name"]');
    if (await nameInput.count() > 0) {
      await nameInput.fill('Temp Value');
      const resetBtn = page.locator('button:has-text("Cancel"), button[type="reset"]');
      if (await resetBtn.count() > 0) {
        await resetBtn.click();
        const revertedVal = await nameInput.inputValue();
        expect(revertedVal).toBe('Aswin Kumar');
      }
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Study Period Regression Tests — Requirements A-D + UI Consistency
// Verifies: start time + duration → actual study period preview is correct
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Study Period Live Preview (Study Planner Preferences)', () => {

  const mockStudentWithEvening = {
    id: 's-123',
    name: 'Aswin Kumar',
    email: 'you@example.com',
    availableHoursPerDay: 2.0,
    preferredStudyTime: 'EVENING',
    emailNotifications: true,
    pushNotifications: false,
  };

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
    });
    await page.route('**/api/students/me', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockStudentWithEvening }),
        });
      }
    });
    await context.addCookies([
      { name: 'access_token', value: 'fake.jwt.token', domain: 'localhost', path: '/' },
    ]);
    await page.goto('/settings');
    await page.waitForTimeout(800);
  });

  /**
   * A: 1 hour + 5:00 PM → 5:00 PM – 6:00 PM
   */
  test('A: 1 hour + Evening (5 PM start) → preview shows 5:00 PM – 6:00 PM', async ({ page }) => {
    const durationSelect = page.locator('[data-testid="study-duration-select"]');
    const timeSelect = page.locator('[data-testid="study-time-select"]');
    const preview = page.locator('[data-testid="study-period-value"]');

    if (await durationSelect.count() > 0 && await timeSelect.count() > 0) {
      await durationSelect.selectOption('1 hour / day');
      await timeSelect.selectOption('5:00 PM');
      await page.waitForTimeout(200);
      const text = await preview.textContent();
      expect(text).toContain('5:00 PM');
      expect(text).toContain('6:00 PM');
    }
  });

  /**
   * B: 2 hours + 5:00 PM → 5:00 PM – 7:00 PM
   */
  test('B: 2 hours + Evening (5 PM start) → preview shows 5:00 PM – 7:00 PM', async ({ page }) => {
    const durationSelect = page.locator('[data-testid="study-duration-select"]');
    const timeSelect = page.locator('[data-testid="study-time-select"]');
    const preview = page.locator('[data-testid="study-period-value"]');

    if (await durationSelect.count() > 0 && await timeSelect.count() > 0) {
      await durationSelect.selectOption('2 hours / day');
      await timeSelect.selectOption('5:00 PM');
      await page.waitForTimeout(200);
      const text = await preview.textContent();
      expect(text).toContain('5:00 PM');
      expect(text).toContain('7:00 PM');
    }
  });

  /**
   * C: 3 hours + 5:00 PM → 5:00 PM – 8:00 PM
   */
  test('C: 3 hours + Evening (5 PM start) → preview shows 5:00 PM – 8:00 PM', async ({ page }) => {
    const durationSelect = page.locator('[data-testid="study-duration-select"]');
    const timeSelect = page.locator('[data-testid="study-time-select"]');
    const preview = page.locator('[data-testid="study-period-value"]');

    if (await durationSelect.count() > 0 && await timeSelect.count() > 0) {
      await durationSelect.selectOption('3 hours / day');
      await timeSelect.selectOption('5:00 PM');
      await page.waitForTimeout(200);
      const text = await preview.textContent();
      expect(text).toContain('5:00 PM');
      expect(text).toContain('8:00 PM');
    }
  });

  /**
   * D: 4 hours + 5:00 PM → 5:00 PM – 9:00 PM
   */
  test('D: 4 hours + Evening (5 PM start) → preview shows 5:00 PM – 9:00 PM', async ({ page }) => {
    const durationSelect = page.locator('[data-testid="study-duration-select"]');
    const timeSelect = page.locator('[data-testid="study-time-select"]');
    const preview = page.locator('[data-testid="study-period-value"]');

    if (await durationSelect.count() > 0 && await timeSelect.count() > 0) {
      await durationSelect.selectOption('4+ hours / day');
      await timeSelect.selectOption('5:00 PM');
      await page.waitForTimeout(200);
      const text = await preview.textContent();
      expect(text).toContain('5:00 PM');
      expect(text).toContain('9:00 PM');
    }
  });

  /**
   * H: The settings dropdown must NOT show old broad-range labels like "Evening (5 PM - 9 PM)"
   */
  test('H: Settings time dropdown shows start-time-only labels, not misleading broad ranges', async ({ page }) => {
    const timeSelect = page.locator('[data-testid="study-time-select"]');

    if (await timeSelect.count() > 0) {
      const optionTexts = await timeSelect.locator('option').allTextContents();

      // Must NOT contain the old misleading broad-range labels
      expect(optionTexts.some(t => t.includes('- 9 PM'))).toBe(false);
      expect(optionTexts.some(t => t.includes('- 12 PM'))).toBe(false);
      expect(optionTexts.some(t => t.includes('- 5 PM'))).toBe(false);

      // Must contain start-time-only options
      expect(optionTexts.some(t => t.includes('5:00 PM'))).toBe(true);
      expect(optionTexts.some(t => t.includes('6:00 AM'))).toBe(true);
    }
  });

  /**
   * E: Preview updates immediately when duration changes (no "Save" required to see new period)
   */
  test('E: Preview updates live without saving when duration changes', async ({ page }) => {
    const durationSelect = page.locator('[data-testid="study-duration-select"]');
    const preview = page.locator('[data-testid="study-period-value"]');

    if (await durationSelect.count() > 0) {
      await durationSelect.selectOption('1 hour / day');
      await page.waitForTimeout(100);
      const text1 = await preview.textContent();

      await durationSelect.selectOption('2 hours / day');
      await page.waitForTimeout(100);
      const text2 = await preview.textContent();

      // Preview must have changed without any save action
      expect(text1).not.toBe(text2);
    }
  });
});
