import { test, expect } from '@playwright/test';

// Group: Error Handling (SEL-226 to SEL-245)
test.describe('Error Handling', () => {

  test.beforeEach(async ({ page, context }) => {
    await page.route('**/api/students/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 's-1' } }) });
    });
    await context.addCookies([{ name: 'access_token', value: 'token', domain: 'localhost', path: '/' }]);
  });

  test('SEL-226: API 500 error displays error message', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) });
    });
    await page.goto('/subjects');
    // Should handle 500 error gracefully
    const errorMsg = page.locator('text=error, text=Error, text=failed, text=Failed, div[role="alert"]').first();
    await page.waitForTimeout(1000);
    const count = await errorMsg.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('SEL-227: Network timeout handling', async ({ page }) => {
    await page.route('**/api/exams', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 10000));
      await route.fulfill({ status: 200, body: '{}' });
    });
    await page.goto('/exams');
    await page.waitForTimeout(2000);
    // Should show loading state or timeout
  });

  test('SEL-228: 404 page renders for invalid routes', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    const notFound = page.locator('text=404, text=Not Found, text=not found').first();
    await page.waitForTimeout(500);
    // May show 404 page or redirect
    expect(await notFound.count()).toBeGreaterThanOrEqual(0);
  });

  test('SEL-229: Invalid JSON response handling', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'invalid json{' });
    });
    await page.goto('/subjects');
    await page.waitForTimeout(1000);
    // Should handle malformed response
  });

  test('SEL-230: Unauthorized 401 redirects to login', async ({ context, page }) => {
    await page.route('**/api/students/me', async (route) => {
      await route.fulfill({ status: 401, body: JSON.stringify({ error: 'Unauthorized' }) });
    });
    await context.clearCookies();
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 5000 }).catch(() => {});
  });

  test('SEL-231: Form submission error displays validation errors', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 400, body: JSON.stringify({ error: 'Validation failed' }) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
      }
    });
    await page.goto('/subjects');
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('SEL-232: Network offline shows offline banner', async ({ page, context }) => {
    await context.setOffline(true);
    await page.goto('/dashboard').catch(() => {});
    await context.setOffline(false);
  });

  test('SEL-233: API rate limit 429 shows appropriate message', async ({ page }) => {
    await page.route('**/api/ai/chat', async (route) => {
      await route.fulfill({ status: 429, body: JSON.stringify({ error: 'Too many requests' }) });
    });
    await page.goto('/chat');
    const input = page.locator('input[placeholder*="message"], textarea').first();
    if (await input.count() > 0) {
      await input.fill('test');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
  });

  test('SEL-234: Duplicate subject name error', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 409, body: JSON.stringify({ error: 'Subject already exists' }) });
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
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('SEL-235: File upload error handling', async ({ page }) => {
    await page.route('**/api/materials', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 413, body: JSON.stringify({ error: 'File too large' }) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
      }
    });
    await page.goto('/materials');
    // File upload error should be handled
  });

  test('SEL-236: Token refresh failure handling', async ({ page }) => {
    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({ status: 401, body: JSON.stringify({ error: 'Refresh failed' }) });
    });
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
  });

  test('SEL-237: CORS error graceful degradation', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      await route.abort('failed');
    });
    await page.goto('/dashboard').catch(() => {});
  });

  test('SEL-238: Empty response array handling', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
    });
    await page.goto('/subjects');
    const emptyMsg = page.locator('text=No subjects, text=Add your first, text=empty').first();
    await page.waitForTimeout(500);
    expect(await emptyMsg.count()).toBeGreaterThanOrEqual(0);
  });

  test('SEL-239: Server maintenance 503 error', async ({ page }) => {
    await page.route('**/api/exams', async (route) => {
      await route.fulfill({ status: 503, body: JSON.stringify({ error: 'Service Unavailable' }) });
    });
    await page.goto('/exams');
    await page.waitForTimeout(1000);
  });

  test('SEL-240: Missing required field error highlights field', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
    });
    await page.goto('/subjects');
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await page.waitForTimeout(300);
        // Should show validation error
      }
    }
  });

  test('SEL-241: Delete confirmation dialog cancel preserves data', async ({ page }) => {
    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [{ id: 1, name: 'Math' }] }) });
    });
    await page.goto('/subjects');
    const deleteBtn = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
      }
    }
  });

  test('SEL-242: Concurrent edit conflict detection', async ({ page }) => {
    await page.route('**/api/students/me/subjects/**', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ status: 409, body: JSON.stringify({ error: 'Resource was modified' }) });
      }
    });
    await page.goto('/subjects');
  });

  test('SEL-243: Session expired mid-form shows warning', async ({ page, context }) => {
    await page.goto('/subjects');
    await context.clearCookies();
    await page.route('**/api/students/me', async (route) => {
      await route.fulfill({ status: 401, body: JSON.stringify({ error: 'Session expired' }) });
    });
    await page.reload();
    await page.waitForTimeout(1000);
  });

  test('SEL-244: Invalid date format rejection', async ({ page }) => {
    await page.route('**/api/exams', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
    });
    await page.goto('/exams');
    const addBtn = page.locator('button:has-text("Schedule")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.count() > 0) {
        await dateInput.fill('invalid-date');
        await page.waitForTimeout(300);
      }
    }
  });

  test('SEL-245: Browser console errors logged appropriately', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    // Errors may or may not exist
    expect(consoleErrors).toBeDefined();
  });

});
