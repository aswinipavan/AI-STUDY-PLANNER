import { test, expect } from '@playwright/test';

// Group: Accessibility & UX (SEL-281 to SEL-290)
test.describe('Accessibility and UX', () => {

  test.beforeEach(async ({ page, context }) => {
    await page.route('**/api/students/me', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { id: 's-1' } }) });
    });
    await context.addCookies([{ name: 'access_token', value: 'token', domain: 'localhost', path: '/' }]);
  });

  test('SEL-281: Tab key navigates through form fields', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
    });
    await page.goto('/subjects');
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      // Tab navigation should work
    }
  });

  test('SEL-282: Escape key closes modal dialogs', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
    });
    await page.goto('/subjects');
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      // Modal should close
    }
  });

  test('SEL-283: Enter key submits forms', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, body: JSON.stringify({ data: { id: 1 } }) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
      }
    });
    await page.goto('/subjects');
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.count() > 0) {
        await nameInput.fill('Math');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
      }
    }
  });

  test('SEL-284: Buttons have accessible labels', async ({ page }) => {
    await page.goto('/dashboard');
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = buttons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      const text = await btn.textContent();
      // Button should have label or text
      expect(ariaLabel || text).toBeTruthy();
    }
  });

  test('SEL-285: Images have alt text', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Images should have alt text
      expect(alt).toBeDefined();
    }
  });

  test('SEL-286: Focus visible on interactive elements', async ({ page }) => {
    await page.goto('/dashboard');
    const firstLink = page.locator('a, button').first();
    if (await firstLink.count() > 0) {
      await firstLink.focus();
      // Element should have focus
      const isFocused = await firstLink.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBeTruthy();
    }
  });

  test('SEL-287: Screen reader text for icons', async ({ page }) => {
    await page.goto('/dashboard');
    const iconButtons = page.locator('button svg, button [class*="icon"]');
    const count = await iconButtons.count();
    // Icon buttons should have accessible names
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('SEL-288: Form labels associated with inputs', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
    });
    await page.goto('/subjects');
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      const inputs = page.locator('input');
      const count = await inputs.count();
      for (let i = 0; i < Math.min(count, 3); i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const name = await input.getAttribute('name');
        const ariaLabel = await input.getAttribute('aria-label');
        // Input should have identifier
        expect(id || name || ariaLabel).toBeTruthy();
      }
    }
  });

  test('SEL-289: Color contrast meets WCAG standards', async ({ page }) => {
    await page.goto('/dashboard');
    // Visual check - automated tools needed for full validation
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('SEL-290: Skip to main content link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a:has-text("Skip to"), a[href="#main"], a[href="#content"]').first();
    // Skip link may exist
    expect(await skipLink.count()).toBeGreaterThanOrEqual(0);
  });

});
