/**
 * Playwright Authenticated State Setup
 * 
 * This module provides reusable authentication fixtures for E2E tests.
 * It creates a valid authenticated session by:
 * 1. Generating a cryptographically valid JWT token
 * 2. Setting the access_token httpOnly cookie
 * 3. Mocking necessary backend API responses
 * 
 * IMPORTANT: This does NOT bypass production authentication.
 * It simulates a user who has already successfully authenticated.
 * Tests that verify the actual login flow must use real Firebase authentication.
 */

import { Page, BrowserContext } from '@playwright/test';
import { createTestJwt } from './generate-test-jwt';

export interface AuthenticatedUser {
  id: string;
  firebaseUid: string;
  name: string;
  email: string;
  isPremium: boolean;
}

export const DEFAULT_TEST_USER: AuthenticatedUser = {
  id: 'e2e-test-student-id-12345678-1234-1234-1234-123456789012',
  firebaseUid: 'e2e-test-firebase-uid-12345',
  name: 'E2E Test User',
  email: 'e2etest@example.com',
  isPremium: false
};

/**
 * Sets up an authenticated Playwright context with a valid JWT token.
 * This simulates a user who has already completed the Firebase + backend authentication flow.
 * 
 * @param context - Playwright BrowserContext
 * @param user - Optional custom user data (defaults to DEFAULT_TEST_USER)
 * @returns The JWT token that was set
 */
export async function setupAuthenticatedContext(
  context: BrowserContext,
  user: AuthenticatedUser = DEFAULT_TEST_USER
): Promise<string> {
  // Generate a valid JWT token using the same secret and algorithm as the backend
  const jwtToken = createTestJwt({
    studentId: user.id,
    firebaseUid: user.firebaseUid,
  });

  // Set the access_token httpOnly cookie
  // This matches exactly what Next.js /api/auth/login sets after successful authentication
  await context.addCookies([{
    name: 'access_token',
    value: jwtToken,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false, // false for localhost testing
    sameSite: 'Strict'
  }]);

  // Skip onboarding modal for all tests
  await context.addInitScript(() => {
    localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
  });

  return jwtToken;
}

/**
 * Sets up common API route mocks for authenticated users.
 * Mocks the backend API responses that protected pages typically need.
 * 
 * @param page - Playwright Page
 * @param user - User data to return in API responses
 */
export async function mockAuthenticatedApiRoutes(
  page: Page,
  user: AuthenticatedUser = DEFAULT_TEST_USER
): Promise<void> {
  // Mock /api/students/me - returns current user profile
  await page.route('**/api/students/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: user.id,
          firebaseUid: user.firebaseUid,
          name: user.name,
          fullName: user.name,
          email: user.email,
          isPremium: user.isPremium,
          collegeName: 'Test University',
          department: 'Computer Science',
          semester: 5,
          availableHoursPerDay: 4.0,
          emailNotifications: true,
          pushNotifications: false
        }
      })
    });
  });

  // Mock /api/students/me/subjects - returns empty subject list
  await page.route('**/api/students/me/subjects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] })
    });
  });

  // Mock /api/performance/report - returns basic performance data
  await page.route('**/api/performance/report', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          overallAverage: 0,
          studyHoursThisWeek: 0,
          completedTasks: 0,
          upcomingExamsCount: 0,
          subjectPerformanceList: []
        }
      })
    });
  });

  // Mock /api/exams/upcoming - returns empty exams list
  await page.route('**/api/exams/upcoming', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] })
    });
  });

  // Mock /api/timetable/active - returns null (no active timetable)
  await page.route('**/api/timetable/active', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: null })
    });
  });

  // Mock /api/materials - returns empty materials list
  await page.route('**/api/materials', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] })
    });
  });

  // Mock /api/wake - always return awake status
  await page.route('**/api/wake', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'awake' })
    });
  });

  // Mock /api/notifications - returns empty notifications list
  await page.route('**/api/notifications**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] })
    });
  });

  // Block Firestore API calls (we're testing with backend APIs only)
  await page.route('**/firestore.googleapis.com/**', async (route) => {
    await route.abort('blockedbyclient');
  });
}

/**
 * Complete authenticated setup - combines context setup and API mocking.
 * Use this for most authenticated tests.
 * 
 * @param page - Playwright Page
 * @param user - Optional custom user data
 * @returns The JWT token that was set
 */
export async function setupAuthenticatedSession(
  page: Page,
  user: AuthenticatedUser = DEFAULT_TEST_USER
): Promise<string> {
  const token = await setupAuthenticatedContext(page.context(), user);
  await mockAuthenticatedApiRoutes(page, user);
  return token;
}

/**
 * Sets up an unauthenticated context (no cookies, clean state).
 * Use this for testing route protection and login flows.
 * 
 * @param context - Playwright BrowserContext
 */
export async function setupUnauthenticatedContext(context: BrowserContext): Promise<void> {
  // Clear all cookies
  await context.clearCookies();
  
  // Skip onboarding modal
  await context.addInitScript(() => {
    localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
  });
}
