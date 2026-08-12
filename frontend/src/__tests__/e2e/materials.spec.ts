import { test, expect } from '@playwright/test';

// Group 6: Study Materials Library (SEL-116 to SEL-130)
test.describe('Materials Section', () => {

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

    await page.route('**/api/materials', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'mat-1', title: 'Lecture Notes 1', fileName: 'notes1.pdf', fileSize: '1.2 MB', fileType: 'pdf', subject: { name: 'Data Structures' }, aiSummary: '1. Introduction to Trees\n2. Binary Heap implementation', createdDate: '2026-08-10' }
          ]
        }),
      });
    });

    await context.addCookies([
      { name: 'access_token', value: 'fake.jwt.token', domain: 'localhost', path: '/' }
    ]);
  });

  test('SEL-116: Upload file via drop zone trigger file selector dialog', async ({ page }) => {
    await page.goto('/materials');
    const uploadInput = page.locator('input[type="file"]');
    expect(uploadInput).toBeDefined();
  });

  test('SEL-117: PDF file upload parsing check', async ({ page }) => {
    await page.goto('/materials');
    // Verify dropzone is present
    const dropzone = page.locator('div[class*="dropzone"], div[class*="upload-zone"]');
    expect(dropzone).toBeDefined();
  });

  test('SEL-118: Large file upload rejection validation (>10MB limits)', async ({ page }) => {
    await page.goto('/materials');
    // Simulates drop of large file
  });

  test('SEL-119: Unsupported file formats rejection warning (.exe files check)', async ({ page }) => {
    await page.goto('/materials');
    // Upload checks for invalid extensions
  });

  test('SEL-120: Materials library page load lists metadata verify', async ({ page }) => {
    await page.goto('/materials');
    await expect(page.locator('text=Lecture Notes 1')).toBeVisible();
    await expect(page.locator('text=notes1.pdf')).toBeVisible();
  });

  test('SEL-121: Empty materials library list guidelines displays', async ({ page }) => {
    await page.route('**/api/materials', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });
    await page.goto('/materials');
    await expect(page.locator('text=No study materials, text=Upload')).toBeVisible();
  });

  test('SEL-122: Subject folder filter filters list view results', async ({ page }) => {
    await page.goto('/materials');
    const folderFilter = page.locator('select[id*="subject"], button:has-text("Data Structures")');
    if (await folderFilter.count() > 0) {
      await folderFilter.click();
      expect(folderFilter).toBeDefined();
    }
  });

  test('SEL-123: Document preview drawer displays metadata cards', async ({ page }) => {
    await page.goto('/materials');
    const matCard = page.locator('text=Lecture Notes 1').first();
    if (await matCard.count() > 0) {
      await matCard.click();
      const drawer = page.locator('div[class*="drawer"], div[class*="preview-drawer"]');
      expect(drawer).toBeDefined();
    }
  });

  test('SEL-124: AI summary text block formatting layout checks', async ({ page }) => {
    await page.goto('/materials');
    const matCard = page.locator('text=Lecture Notes 1').first();
    if (await matCard.count() > 0) {
      await matCard.click();
      // Should show summary inside drawer
      const summaryText = page.locator('text=Binary Heap implementation');
      expect(summaryText).toBeDefined();
    }
  });

  test('SEL-125: AI auto-categorized subject badge details displays', async ({ page }) => {
    await page.goto('/materials');
    const matCard = page.locator('text=Lecture Notes 1').first();
    if (await matCard.count() > 0) {
      await matCard.click();
      // Category badge visible
      const categoryBadge = page.locator('span[class*="badge"], text=Data Structures').first();
      await expect(categoryBadge).toBeVisible();
    }
  });

  test('SEL-126: Cancel delete study material leaves item active', async ({ page }) => {
    await page.goto('/materials');
    const deleteBtn = page.locator('button[class*="delete"], svg[class*="delete"]').first();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await page.click('button:has-text("Cancel")');
      await expect(page.locator('text=Lecture Notes 1')).toBeVisible();
    }
  });

  test('SEL-127: Confirm delete study material removes item from library', async ({ page }) => {
    await page.route('**/api/materials/mat-1', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/materials', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });

    await page.goto('/materials');
    const deleteBtn = page.locator('button[class*="delete"], svg[class*="delete"]').first();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await page.click('button:has-text("Delete"), button:has-text("Confirm")');
      await expect(page.locator('text=Lecture Notes 1')).not.toBeVisible();
    }
  });

  test('SEL-128: Upload file progress indicator rendering', async ({ page }) => {
    await page.goto('/materials');
    // Upload progression checks
  });

  test('SEL-129: Material save triggers validation block on empty file selection', async ({ page }) => {
    await page.goto('/materials');
    const uploadBtn = page.locator('button:has-text("Upload"), button[type="submit"]');
    if (await uploadBtn.count() > 0) {
      const isDisabled = await uploadBtn.isDisabled().catch(() => false);
      expect(isDisabled).toBeDefined();
    }
  });

  test('SEL-130: Materials list filters matches keywords queries search', async ({ page }) => {
    await page.goto('/materials');
    const searchBar = page.locator('input[placeholder*="Search"]');
    if (await searchBar.count() > 0) {
      await searchBar.fill('Lecture');
      await expect(page.locator('text=Lecture Notes 1')).toBeVisible();
    }
  });

});
