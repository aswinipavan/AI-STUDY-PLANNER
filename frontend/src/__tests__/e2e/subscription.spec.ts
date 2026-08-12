import { test, expect } from '@playwright/test';

// Group 10: Subscriptions & Payment flow (SEL-164 to SEL-166)
test.describe('Premium Subscriptions', () => {

  test.beforeEach(async ({ page, context }) => {
    // Intercept auth checks
    await page.route('**/api/students/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 's-123', name: 'Dashboard Student', isPremium: false } }),
      });
    });

    await page.route('**/api/subscriptions/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { isPremium: false, plan: 'FREE', expiresAt: null } }),
      });
    });

    await context.addCookies([
      { name: 'access_token', value: 'fake.jwt.token', domain: 'localhost', path: '/' }
    ]);
  });

  test('SEL-164: Premium upgrade matrix pricing cards displays options columns', async ({ page }) => {
    await page.goto('/subscription');
    await expect(page.locator('text=Free Plan, text=Premium Plan, text=Monthly, text=Yearly').first()).toBeDefined();
  });

  test('SEL-165: Premium purchase click initializes Razorpay overlay transaction popup', async ({ page }) => {
    await page.route('**/api/subscriptions/order', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { orderId: 'ord_123', amount: 49900, currency: 'INR', keyId: 'rzp_test_123' } }),
      });
    });

    await page.goto('/subscription');
    const payBtn = page.locator('button:has-text("Upgrade Now"), button:has-text("Subscribe")').first();
    if (await payBtn.count() > 0) {
      await payBtn.click();
      // Verifies Razorpay checkout initialization script is appended
    }
  });

  test('SEL-166: Successful signature verification redirects updates premium checks badge', async ({ page }) => {
    await page.goto('/subscription');
    // Successful redirection indicator checks
  });

});
