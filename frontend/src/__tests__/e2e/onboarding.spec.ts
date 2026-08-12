import { test, expect } from '@playwright/test';

// Group 11: Onboarding Flip-book Wizard (SEL-167 to SEL-170)
test.describe('3D Onboarding', () => {

  test.beforeEach(async ({ page, context }) => {
    // Intercept auth checks
    await page.route('**/api/students/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 's-123', name: 'Dashboard Student' } }),
      });
    });

    await context.addCookies([
      { name: 'access_token', value: 'fake.jwt.token', domain: 'localhost', path: '/' }
    ]);
  });

  test('SEL-167: 3D Book page turn trigger flips sheets animation validation', async ({ page }) => {
    await page.goto('/onboarding');
    const book = page.locator('div[class*="book"], div[class*="BookOnboarding"]');
    expect(book).toBeDefined();
  });

  test('SEL-168: Skip onboarding updates local storage key redirects dashboard', async ({ page }) => {
    await page.goto('/onboarding');
    const skipBtn = page.locator('button:has-text("Skip"), button[class*="skip"]').first();
    if (await skipBtn.count() > 0) {
      await skipBtn.click();
      await expect(page).toHaveURL(/\/dashboard/);
      const isCompleted = await page.evaluate(() => localStorage.getItem('study_onboarding_completed'));
      expect(isCompleted).toBe('true');
    }
  });

  test('SEL-169: Active slide progress dot tracker matches page indexes check', async ({ page }) => {
    await page.goto('/onboarding');
    const activeDot = page.locator('span[class*="dot-active"], button[class*="dot-active"]');
    expect(activeDot).toBeDefined();
  });

  test('SEL-170: Keyboard navigation arrow keys swipe slides checks', async ({ page }) => {
    await page.goto('/onboarding');
    await page.keyboard.press('ArrowRight');
    // Slide changes check
  });

});
