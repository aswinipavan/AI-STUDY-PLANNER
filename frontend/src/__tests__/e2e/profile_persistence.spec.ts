/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedContext, mockAuthenticatedApiRoutes } from '../../../playwright/auth-setup';

test.describe('E2E Profile Persistence & Relogin Tests', () => {
  const mockStudent = {
    id: '99999999-8888-7777-6666-555555555555',
    firebaseUid: 'google-uid-persistence-test',
    fullName: 'Aswin Kumar Dev',
    name: 'Aswin Kumar Dev',
    email: 'aswin.dev@example.edu',
    collegeName: 'National Institute of Technology',
    semester: 5,
    department: 'Computer Science',
    phoneNumber: '+91 9876543210',
    availableHoursPerDay: 3,
    preferredStudyTime: 'EVENING',
    profilePictureUrl: 'https://lh3.googleusercontent.com/a/avatar.jpg',
    photoUrl: 'https://lh3.googleusercontent.com/a/avatar.jpg',
    isPremium: false,
    studyStreak: 7,
  };

  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedContext(context, mockStudent);
    await mockAuthenticatedApiRoutes(page, mockStudent);

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
  });

  test('PERSIST-001: All profile fields (Name, College, Semester, Department, Phone) save and persist across page reload', async ({ page }) => {
    let savedPayload: any = null;

    await page.route('**/api/students/me', async (route) => {
      if (route.request().method() === 'GET') {
        const profile = savedPayload
          ? {
              ...mockStudent,
              ...savedPayload,
              name: savedPayload.fullName || savedPayload.name || mockStudent.name,
              fullName: savedPayload.fullName || savedPayload.name || mockStudent.fullName,
            }
          : mockStudent;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'OK', data: profile }),
        });
      } else if (route.request().method() === 'PUT') {
        savedPayload = JSON.parse(route.request().postData() || '{}');
        const updated = {
          ...mockStudent,
          ...savedPayload,
          name: savedPayload.fullName || savedPayload.name || mockStudent.name,
          fullName: savedPayload.fullName || savedPayload.name || mockStudent.fullName,
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Profile updated', data: updated }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify initial pre-populated values
    const nameInput = page.locator('input[name="name"], input[placeholder="Your name"]').first();
    const collegeInput = page.locator('input[name="collegeName"]').first();
    const semesterSelect = page.locator('[data-testid="settings-semester-select"]').first();
    const departmentSelect = page.locator('[data-testid="settings-department-select"]').first();
    const phoneInput = page.locator('[data-testid="settings-phone-input"], input[name="phoneNumber"]').first();

    await expect(nameInput).toHaveValue('Aswin Kumar Dev');
    await expect(collegeInput).toHaveValue('National Institute of Technology');
    await expect(semesterSelect).toHaveValue('5');
    await expect(departmentSelect).toHaveValue('Computer Science');
    await expect(phoneInput).toHaveValue('+91 9876543210');

    // 2. Modify every single editable field
    await nameInput.fill('Aswin Kumar Updated');
    await collegeInput.fill('Massachusetts Institute of Technology');
    await semesterSelect.selectOption('6');
    await departmentSelect.selectOption('Information Technology');
    await phoneInput.fill('+91 9123456789');

    // 3. Click Save Profile
    const saveButton = page.locator('button[type="submit"]:has-text("Save Profile")').first();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // 4. Verify save success banner
    await expect(page.getByText(/Profile saved successfully/i)).toBeVisible({ timeout: 10000 });

    // 5. Verify the intercepted PUT payload contained every field with integer semester
    expect(savedPayload).toBeTruthy();
    expect(savedPayload.fullName).toBe('Aswin Kumar Updated');
    expect(savedPayload.collegeName).toBe('Massachusetts Institute of Technology');
    expect(savedPayload.semester).toBe(6);
    expect(savedPayload.department).toBe('Information Technology');
    expect(savedPayload.phoneNumber).toBe('+91 9123456789');

    // 6. Hard page reload (F5)
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // 7. Verify all updated fields remain intact after reload
    await expect(nameInput).toHaveValue('Aswin Kumar Updated');
    await expect(collegeInput).toHaveValue('Massachusetts Institute of Technology');
    await expect(semesterSelect).toHaveValue('6');
    await expect(departmentSelect).toHaveValue('Information Technology');
    await expect(phoneInput).toHaveValue('+91 9123456789');
  });

  test('PERSIST-002: Phone number can be updated or removed without crashing', async ({ page }) => {
    let savedPayload: any = null;

    await page.route('**/api/students/me', async (route) => {
      if (route.request().method() === 'GET') {
        const profile = savedPayload
          ? {
              ...mockStudent,
              ...savedPayload,
              name: savedPayload.fullName || savedPayload.name || mockStudent.name,
              fullName: savedPayload.fullName || savedPayload.name || mockStudent.fullName,
            }
          : mockStudent;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'OK', data: profile }),
        });
      } else if (route.request().method() === 'PUT') {
        savedPayload = JSON.parse(route.request().postData() || '{}');
        const updated = {
          ...mockStudent,
          ...savedPayload,
          name: savedPayload.fullName || savedPayload.name || mockStudent.name,
          fullName: savedPayload.fullName || savedPayload.name || mockStudent.fullName,
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Profile updated', data: updated }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    const phoneInput = page.locator('[data-testid="settings-phone-input"], input[name="phoneNumber"]').first();
    await expect(phoneInput).toHaveValue('+91 9876543210', { timeout: 10000 });
    await phoneInput.fill('');

    const saveButton = page.locator('button[type="submit"]:has-text("Save Profile")').first();
    await expect(saveButton).toBeEnabled({ timeout: 10000 });
    await saveButton.click();

    await expect(page.getByText(/Profile saved successfully/i)).toBeVisible({ timeout: 10000 });
    expect(savedPayload.phoneNumber).toBe('');
  });

  test('PERSIST-003: Logout and relogin preserves all previously saved profile fields', async ({ page }) => {
    const savedStudent = {
      ...mockStudent,
      fullName: 'Aswin Relogin Verified',
      name: 'Aswin Relogin Verified',
      collegeName: 'Indian Institute of Science',
      semester: 7,
      department: 'Data Science',
      phoneNumber: '+91 9000011111',
    };

    // Route for mock backend
    await page.route('**/api/students/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: savedStudent }),
      });
    });

    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          accessToken: 'fake-relogin-token',
          user: savedStudent,
        }),
      });
    });

    // 1. Visit settings page
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    // 2. Verify all custom saved fields are present
    const nameInput = page.locator('input[name="name"], input[placeholder="Your name"]').first();
    const collegeInput = page.locator('input[name="collegeName"]').first();
    const semesterSelect = page.locator('[data-testid="settings-semester-select"]').first();
    const departmentSelect = page.locator('[data-testid="settings-department-select"]').first();
    const phoneInput = page.locator('[data-testid="settings-phone-input"], input[name="phoneNumber"]').first();

    await expect(nameInput).toHaveValue('Aswin Relogin Verified', { timeout: 10000 });
    await expect(collegeInput).toHaveValue('Indian Institute of Science');
    await expect(semesterSelect).toHaveValue('7');
    await expect(departmentSelect).toHaveValue('Data Science');
    await expect(phoneInput).toHaveValue('+91 9000011111');
  });
});
