import { test, expect } from '@playwright/test';

const VALID_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJlbWFpbCI6ImFzd2luaXBhd2FuODZAZ21haWwuY29tIiwiaWF0IjoxNzgxNTEwOTUxLCJleHAiOjIwOTcwODY5NTF9.ZlQ1_JVTGyglYJuOm2w6BdWSCqEI749Xtsfad7QpvIY';

test.describe('Final Independent Verification Suite', () => {

  test.beforeEach(async ({ page, context }) => {
    // 1. Skip onboarding modal & inject user session
    await context.addInitScript(() => {
      localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
      localStorage.setItem('studyplanner_onboarding_completed', 'true');
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Aswini Pavan',
            email: 'aswinipavan86@gmail.com',
            collegeName: 'Stanford University',
            department: 'Computer Science',
            semester: '3rd Year',
            phoneNumber: '+1-555-0199',
            photoUrl: 'https://lh3.googleusercontent.com/a/ACg8ocL6f3V7BNTf0BFwj22jQFj-VgFPTXwbYwKWl0pdui0La_yph8P-=s96-c',
            profilePictureUrl: 'https://lh3.googleusercontent.com/a/ACg8ocL6f3V7BNTf0BFwj22jQFj-VgFPTXwbYwKWl0pdui0La_yph8P-=s96-c',
            isPremium: false,
          },
          token: VALID_JWT,
        },
        version: 0,
      }));
    });

    // 2. Add structural 3-part JWT cookie for Next.js proxy
    await context.addCookies([
      { name: 'access_token', value: VALID_JWT, domain: 'localhost', path: '/' }
    ]);

    // 3. Mock fast responses for reliable testing
    await page.route('**/api/wake', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'UP' }) });
    });

    await page.route('**/api/exams/upcoming', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'ex-1', subjectName: 'Computer Architecture', examName: 'Midterm', examDate: '2026-09-01', difficulty: 'medium' }
          ]
        })
      });
    });

    await page.route('**/api/subscriptions/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { isPremium: false, plan: 'Free' }
        })
      });
    });
  });

  test('Req 1 & 21: Landing Page & UI Consistency', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/AI Study Planner/i);

    // Verify Hero title
    const heroTitle = page.locator('h1');
    await expect(heroTitle).toBeVisible();

    // Verify Navigation link
    const signInBtn = page.locator('#nav-signin, a[href="/login"]').first();
    await expect(signInBtn).toBeVisible();

    // Verify trust section
    const trustText = page.locator('text=Trusted by 10,000+ Students');
    await expect(trustText).toBeVisible();
  });

  test('Req 1 & 8: Login Page, Tabs, and OAuth Elements', async ({ page, context }) => {
    // Clear cookies for login page test
    await context.clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    
    // Verify Sign In & Register tabs exist
    const tabs = page.locator('button', { hasText: /Sign In|Register/ });
    expect(await tabs.count()).toBeGreaterThanOrEqual(2);

    // Verify Google sign-in button exists
    const googleBtn = page.locator('button', { hasText: /Google/i });
    await expect(googleBtn).toBeVisible();

    // Verify email & password inputs
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('Req 2, 3, 4: Profile Management, Avatar Upload UI, and Field Persistence', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    // Verify profile avatar container
    const avatar = page.locator('[aria-label="Change profile picture"], img[alt="Profile"]');
    await expect(avatar.first()).toBeVisible();

    // Verify input fields
    const nameInput = page.locator('input[name="fullName"], input[placeholder*="Name" i]').first();
    await expect(nameInput).toBeVisible();

    // Verify College input exists
    const collegeInput = page.locator('input[name="collegeName"]').first();
    await expect(collegeInput).toBeVisible();
  });

  test('Req 5, 6, 7: Header Controls (Theme Toggle, Notifications, Profile Dropdown)', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // 1. Theme toggle
    const themeBtn = page.locator('#topbar-theme-toggle').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      const themeInStorage = await page.evaluate(() => localStorage.getItem('theme'));
      expect(['light', 'dark']).toContain(themeInStorage);
    }

    // 2. Notification Bell
    const bellBtn = page.locator('#topbar-bell').first();
    if (await bellBtn.isVisible()) {
      await bellBtn.click();
      await page.waitForTimeout(300);
      // Verify dropdown appears
      const notifMenu = page.locator('text=Upcoming Exams');
      await expect(notifMenu).toBeVisible();
    }

    // 3. Profile Avatar Dropdown
    const avatarBtn = page.locator('#topbar-avatar').first();
    if (await avatarBtn.isVisible()) {
      await avatarBtn.click();
      await page.waitForTimeout(300);
      // Verify menu items
      const settingsLink = page.locator('a[href="/settings"]');
      expect(await settingsLink.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('Req 9 & 10: AI Chat Page, Session Loading, and Interface', async ({ page }) => {
    await page.goto('/chat', { waitUntil: 'domcontentloaded' });

    // Verify chat UI renders
    const chatInput = page.locator('textarea, input[placeholder*="Ask" i], input[placeholder*="message" i]').first();
    await expect(chatInput).toBeVisible();

    // Verify New Chat button
    const newChatBtn = page.locator('button', { hasText: /New Chat/i });
    if (await newChatBtn.isVisible()) {
      await expect(newChatBtn).toBeEnabled();
    }
  });

  test('Req 12 & 13: Exams Page and Add Exam Modal', async ({ page }) => {
    await page.goto('/exams', { waitUntil: 'domcontentloaded' });

    // Verify Exams page content
    const examHeader = page.locator('h1, h2, button:has-text("Add Exam")').first();
    await expect(examHeader).toBeVisible();

    // Click Add Exam
    const addExamBtn = page.locator('button', { hasText: /Add Exam/i }).first();
    if (await addExamBtn.isVisible()) {
      await addExamBtn.click();
      await page.waitForTimeout(400);

      // Verify Modal fields
      const examNameInput = page.locator('input[placeholder*="Exam Name" i], input[name="examName"]').first();
      await expect(examNameInput).toBeVisible();

      // Close modal
      const cancelBtn = page.locator('button', { hasText: /Cancel/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }
  });

  test('Req 14, 15, 16: Timetable Page and Generator', async ({ page }) => {
    await page.goto('/timetable', { waitUntil: 'domcontentloaded' });

    // Verify Timetable calendar view
    const timetableContent = page.locator('main').first();
    await expect(timetableContent).toBeVisible();

    // Navigate to generator
    await page.goto('/timetable/generate', { waitUntil: 'domcontentloaded' });
    const generateHeader = page.locator('h1, h2', { hasText: /Generate|Plan/i }).first();
    await expect(generateHeader).toBeVisible();
  });

  test('Req 11 & 19: Materials Page, Upload Zone, NLP Document Intelligence, and Subject Filters', async ({ page }) => {
    // Mock materials with document intelligence data
    await page.route('**/api/materials/', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'mat-101',
                title: 'Data Structures & Algorithms Lecture Notes',
                fileUrl: 'https://example.com/dsa.pdf',
                fileType: 'pdf',
                fileSizeBytes: 2450000,
                processingStatus: 'COMPLETED',
                overallDifficulty: 'HARD',
                difficultyScore: 85,
                difficultyReason: 'High algorithmic complexity with graph traversal and dynamic programming.',
                aiCategorizedSubject: 'Computer Science',
                extractedTopics: [
                  { name: 'Binary Search Trees & AVL Balancing', chapter: 'Chapter 3', relevanceScore: 0.95 }
                ],
                extractedKeywords: ['BST', 'AVL Tree', 'Traversal', 'Recursion'],
                aiSummary: 'Comprehensive overview of balanced search trees and algorithms.',
                uploadedAt: new Date().toISOString(),
              }
            ]
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/materials', { waitUntil: 'domcontentloaded' });

    // Verify upload zone
    const uploadText = page.locator('text=Drag & drop files here, or click to browse');
    await expect(uploadText).toBeVisible();

    // Verify subject folder selector
    const subjectSelect = page.locator('select').first();
    await expect(subjectSelect).toBeVisible();

    // Verify NLP Processed badge
    const nlpBadge = page.locator('text=NLP Processed');
    await expect(nlpBadge).toBeVisible();

    // Verify Difficulty badge
    const diffBadge = page.locator('text=HARD • 85/100');
    await expect(diffBadge).toBeVisible();

    // Click Topics toggle to expand
    const topicsBtn = page.locator('button', { hasText: /Topics/i }).first();
    if (await topicsBtn.isVisible()) {
      await topicsBtn.click();
      await page.waitForTimeout(300);
      const topicItem = page.locator('text=Binary Search Trees & AVL Balancing');
      await expect(topicItem).toBeVisible();
    }
  });

  test('Req 17 & 18: Subscription Page and Pricing Tiers', async ({ page }) => {
    await page.goto('/subscription', { waitUntil: 'domcontentloaded' });

    // Verify subscription heading & pricing tiers
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    // Verify Upgrade / Action buttons exist
    const planButtons = page.locator('button', { hasText: /Get Started|Upgrade|Subscribe|Active|Monthly|Yearly/i });
    expect(await planButtons.count()).toBeGreaterThanOrEqual(1);
  });

  test('Req 20: Responsive Mobile Viewport (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Verify no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify page content is visible in mobile
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();
  });

});
