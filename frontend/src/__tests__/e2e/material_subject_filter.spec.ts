/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedContext, mockAuthenticatedApiRoutes } from '../../../playwright/auth-setup';

test.describe('Materials Subject Filter End-to-End Tests', () => {
  const mockStudent = {
    id: '99999999-8888-7777-6666-555555555555',
    firebaseUid: 'test-filter-uid-12345',
    fullName: 'Test Student',
    name: 'Test Student',
    email: 'test@example.com',
    collegeName: 'Test University',
    semester: 5,
    department: 'Computer Science',
    isPremium: false,
  };

  const mockSubjects = [
    { id: 'sub-dm-101', subjectName: 'Discrete Maths', name: 'Discrete Maths' },
    { id: 'sub-os-202', subjectName: 'Operating Systems', name: 'Operating Systems' },
    { id: 'sub-algo-303', subjectName: 'Algorithms', name: 'Algorithms' },
  ];

  const mockMaterials = [
    {
      id: 'mat-dm-1',
      title: 'Discrete Maths Unit 1 Notes',
      fileName: 'discrete_maths_unit1.pdf',
      fileUrl: 'http://localhost:8080/api/files/materials/s-123/discrete_maths_unit1.pdf',
      fileType: 'pdf',
      subjectId: 'sub-dm-101',
      subjectName: 'Discrete Maths',
      subject: { id: 'sub-dm-101', subjectName: 'Discrete Maths' },
      uploadedAt: '2026-08-27T10:00:00Z',
    },
    {
      id: 'mat-os-1',
      title: 'OS Kernel Architecture Manual',
      fileName: 'os_kernel.pdf',
      fileUrl: 'http://localhost:8080/api/files/materials/s-123/os_kernel.pdf',
      fileType: 'pdf',
      subjectId: 'sub-os-202',
      subjectName: 'Operating Systems',
      subject: { id: 'sub-os-202', subjectName: 'Operating Systems' },
      uploadedAt: '2026-08-27T11:00:00Z',
    },
  ];

  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedContext(context, mockStudent);

    await page.addInitScript((student) => {
      localStorage.setItem('auth-store', JSON.stringify({
        state: {
          user: student,
          isAuthenticated: true,
          isPremium: false,
        },
        version: 0,
      }));
    }, mockStudent);

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

    await page.route('**/api/students/me/subjects', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: mockSubjects,
        }),
      });
    });

    await page.route('**/api/materials**', async (route) => {
      const url = new URL(route.request().url());
      const subjectIdParam = url.searchParams.get('subjectId');
      
      let data = mockMaterials;
      if (subjectIdParam) {
        data = mockMaterials.filter(m => m.subjectId === subjectIdParam);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data }),
      });
    });

    await page.route('**/api/wake', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'awake' }) });
    });

    await page.route('**/api/notifications**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });

    await page.route('**/api/timetable/active', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) });
    });
  });

  test('Shows all materials when All Subjects filter is selected', async ({ page }) => {
    await page.goto('/materials');
    await expect(page.locator('text=Discrete Maths Unit 1 Notes')).toBeVisible();
    await expect(page.locator('text=OS Kernel Architecture Manual')).toBeVisible();
  });

  test('Filters to show ONLY Discrete Maths when Discrete Maths is selected in filter dropdown', async ({ page }) => {
    await page.goto('/materials');
    
    // Initial state shows both
    await expect(page.locator('text=Discrete Maths Unit 1 Notes')).toBeVisible();
    await expect(page.locator('text=OS Kernel Architecture Manual')).toBeVisible();

    // Select "Discrete Maths" from dropdown
    const filterDropdown = page.locator('select').last();
    await filterDropdown.selectOption({ label: 'Discrete Maths' });

    // Discrete Maths MUST be visible
    await expect(page.locator('text=Discrete Maths Unit 1 Notes')).toBeVisible();
    // OS Manual MUST NOT be visible
    await expect(page.locator('text=OS Kernel Architecture Manual')).not.toBeVisible();
  });

  test('Filters to show ONLY Operating Systems when Operating Systems is selected', async ({ page }) => {
    await page.goto('/materials');

    const filterDropdown = page.locator('select').last();
    await filterDropdown.selectOption({ label: 'Operating Systems' });

    // OS Manual MUST be visible
    await expect(page.locator('text=OS Kernel Architecture Manual')).toBeVisible();
    // Discrete Maths MUST NOT be visible
    await expect(page.locator('text=Discrete Maths Unit 1 Notes')).not.toBeVisible();
  });

  test('Returns to showing all materials when switched back to All Subjects', async ({ page }) => {
    await page.goto('/materials');

    const filterDropdown = page.locator('select').last();
    await filterDropdown.selectOption({ label: 'Discrete Maths' });
    await expect(page.locator('text=OS Kernel Architecture Manual')).not.toBeVisible();

    // Switch back to All Subjects
    await filterDropdown.selectOption({ label: 'All Subjects' });
    await expect(page.locator('text=Discrete Maths Unit 1 Notes')).toBeVisible();
    await expect(page.locator('text=OS Kernel Architecture Manual')).toBeVisible();
  });

  test('Displays subject badge on each material card', async ({ page }) => {
    await page.goto('/materials');

    // Check that the subject badge renders on cards
    const dmBadge = page.locator('div[class*="subjectBadge"]:has-text("Discrete Maths")');
    const osBadge = page.locator('div[class*="subjectBadge"]:has-text("Operating Systems")');
    await expect(dmBadge).toBeVisible();
    await expect(osBadge).toBeVisible();
  });
});
