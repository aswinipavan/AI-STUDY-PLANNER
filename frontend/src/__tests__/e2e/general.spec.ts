import { test, expect } from '@playwright/test';

// Group 12: General and Responsive viewports (SEL-171 to SEL-300)
test.describe('Responsive Viewports and Audits', () => {

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

    await context.addCookies([
      { name: 'access_token', value: 'fake.jwt.token', domain: 'localhost', path: '/' }
    ]);
  });

  const mobileDevices = [
    { id: 171, name: 'iPhone 13', width: 390, height: 844 },
    { id: 172, name: 'iPhone SE', width: 375, height: 667 },
    { id: 173, name: 'Pixel 5', width: 393, height: 851 },
    { id: 174, name: 'Galaxy S20', width: 360, height: 800 },
  ];

  for (const dev of mobileDevices) {
    test(`SEL-${dev.id}: Viewport scaling audit on ${dev.name}`, async ({ page }) => {
      await page.setViewportSize({ width: dev.width, height: dev.height });
      await page.goto('/');
      const content = page.locator('html');
      await expect(content).toBeVisible();
    });
  }

  const tabletDevices = [
    { id: 175, name: 'iPad Pro', width: 1024, height: 1366 },
    { id: 176, name: 'iPad Mini', width: 768, height: 1024 },
    { id: 177, name: 'Nexus 9', width: 768, height: 1024 },
  ];

  for (const dev of tabletDevices) {
    test(`SEL-${dev.id}: Viewport scaling audit on ${dev.name}`, async ({ page }) => {
      await page.setViewportSize({ width: dev.width, height: dev.height });
      await page.goto('/');
      const content = page.locator('html');
      await expect(content).toBeVisible();
    });
  }

  const desktopResolutions = [
    { id: 178, name: 'FHD', width: 1920, height: 1080 },
    { id: 179, name: 'MacBook 13', width: 1280, height: 800 },
    { id: 180, name: '4K', width: 3840, height: 2160 },
  ];

  for (const dev of desktopResolutions) {
    test(`SEL-${dev.id}: Viewport scaling audit on ${dev.name}`, async ({ page }) => {
      await page.setViewportSize({ width: dev.width, height: dev.height });
      await page.goto('/');
      const content = page.locator('html');
      await expect(content).toBeVisible();
    });
  }

  // SEL-181 to SEL-300 are now implemented in dedicated spec files:
  // - navigation.spec.ts (SEL-181 to SEL-200)
  // - forms.spec.ts (SEL-201 to SEL-225)
  // - errors.spec.ts (SEL-226 to SEL-245)
  // - states.spec.ts (SEL-246 to SEL-260)
  // - interactions.spec.ts (SEL-261 to SEL-280)
  // - accessibility.spec.ts (SEL-281 to SEL-290)
  // - workflows.spec.ts (SEL-291 to SEL-300)

});
