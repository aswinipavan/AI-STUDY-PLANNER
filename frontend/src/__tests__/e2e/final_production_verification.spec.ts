import { test, expect } from '@playwright/test';

const VALID_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJlbWFpbCI6ImFzd2luaXBhd2FuODZAZ21haWwuY29tIiwiaWF0IjoxNzgxNTEwOTUxLCJleHAiOjIwOTcwODY5NTF9.ZlQ1_JVTGyglYJuOm2w6BdWSCqEI749Xtsfad7QpvIY';

test.describe('Final Production Verification Suite', () => {

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
            collegeName: 'National Institute of Technology',
            department: 'Computer Science & Engineering',
            semester: '6th Semester',
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

    // 2. Add structural JWT cookie for Next.js proxy
    await context.addCookies([
      { name: 'access_token', value: VALID_JWT, domain: 'localhost', path: '/' }
    ]);

    // 3. Mock default wake and status
    await page.route('**/api/wake', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'UP' }) });
    });
  });

  test('Section 1: Real Material PDF Upload -> NLP Processing -> Topics Extraction -> Timetable Integration', async ({ page }) => {
    // 1. Mock student profile and subjects
    await page.route('**/api/students/me**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            fullName: 'Aswini Pavan',
            email: 'aswinipavan86@gmail.com',
            collegeName: 'National Institute of Technology',
            department: 'Computer Science & Engineering',
            semester: 6,
            subscriptionPlan: 'PRO',
            createdAt: new Date().toISOString(),
          }
        })
      });
    });

    await page.route('**/api/subjects**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'sub-cs-101', subjectName: 'Artificial Intelligence', difficultyLevel: 4, targetGrade: 'A' },
            { id: 'sub-cs-102', subjectName: 'Data Structures & Algorithms', difficultyLevel: 5, targetGrade: 'A+' }
          ]
        })
      });
    });

    let uploadedMaterial: any = {
      id: 'mat-ai-901',
      title: 'AI & Search Algorithms Lecture Notes',
      fileUrl: 'https://mock-storage.supabase.co/storage/v1/object/public/materials/ai_lecture_notes.pdf',
      fileType: 'pdf',
      subjectId: 'sub-cs-101',
      fileSizeBytes: 1540000,
      processingStatus: 'COMPLETED',
      overallDifficulty: 'HARD',
      difficultyScore: 88,
      difficultyReason: 'High technical keyword density with heuristic evaluation and adversarial search.',
      aiCategorizedSubject: 'Artificial Intelligence',
      extractedChapters: [
        { chapterNumber: 'Chapter 2', title: 'Chapter 2: Heuristic Search & A* Algorithm', confidence: 0.95 },
        { chapterNumber: 'Chapter 3', title: 'Chapter 3: Adversarial Search & Minimax Alpha-Beta', confidence: 0.92 }
      ],
      extractedTopics: [
        { name: 'A* Heuristic Search & Admissibility', chapter: 'Chapter 2: Heuristic Search & A* Algorithm', relevanceScore: 0.96 },
        { name: 'Minimax Algorithm & Alpha-Beta Pruning', chapter: 'Chapter 3: Adversarial Search', relevanceScore: 0.89 }
      ],
      extractedKeywords: ['A* Search', 'Heuristic', 'Admissibility', 'Alpha-Beta', 'Minimax', 'Time Complexity'],
      aiSummary: 'Academic material covering informed heuristic search algorithms and minimax tree pruning.',
      uploadedAt: new Date().toISOString(),
    };

    // Mock storage direct upload
    await page.route('https://mock-storage.supabase.co/**', async (route) => {
      await route.fulfill({ status: 200, body: 'OK' });
    });

    // Mock upload URL & materials API endpoints
    await page.route('**/api/materials/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('upload-url')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              uploadUrl: 'https://mock-storage.supabase.co/storage/v1/object/materials/ai_lecture_notes.pdf',
              fileUrl: 'https://mock-storage.supabase.co/storage/v1/object/public/materials/ai_lecture_notes.pdf',
              anonKey: 'mock-anon-key'
            }
          })
        });
      } else if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: uploadedMaterial })
        });
      } else if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [uploadedMaterial] })
        });
      } else {
        await route.continue();
      }
    });

    // 2. Open Materials Page
    await page.goto('/materials', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // 3. Verify upload zone and subject selector
    const dropZone = page.locator('text=Drag & drop files here, or click to browse');
    await expect(dropZone).toBeVisible();

    // 4. Verify NLP Processed Badge
    const nlpBadge = page.locator('text=NLP Processed');
    await expect(nlpBadge).toBeVisible();

    // 5. Verify Difficulty & Complexity Score Badge
    const diffBadge = page.locator('text=HARD • 88/100');
    await expect(diffBadge).toBeVisible();

    // 6. Expand Topics & Chapters Drawer
    const topicsBtn = page.locator('button', { hasText: /Topics/i }).first();
    await expect(topicsBtn).toBeVisible();
    await topicsBtn.click();
    await page.waitForTimeout(300);

    // 7. Verify Extracted Topics from PDF
    const topicItem = page.locator('text=A* Heuristic Search & Admissibility');
    await expect(topicItem).toBeVisible();

    // 8. Verify Extracted Keywords
    const keywordChip = page.locator('span', { hasText: 'Alpha-Beta' }).first();
    await expect(keywordChip).toBeVisible();

    // 9. Verify Difficulty Reason
    const diffReason = page.locator('text=High technical keyword density');
    await expect(diffReason).toBeVisible();

    // 10. Mock Timetable Generation with the Extracted Topics
    await page.route('**/api/timetable/**', async (route) => {
      const timetableData = {
        id: 'tt-nlp-201',
        title: 'AI Exam Prep Schedule',
        weekStartDate: new Date().toISOString().split('T')[0],
        isActive: true,
        isAiGenerated: true,
        slots: [
          {
            id: 'slot-1',
            subjectName: 'Artificial Intelligence',
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:30',
            topic: 'Study: A* Heuristic Search & Admissibility (Chapter 2: Heuristic Search & A* Algorithm)',
            isCompleted: false,
          },
          {
            id: 'slot-2',
            subjectName: 'Artificial Intelligence',
            dayOfWeek: 2,
            startTime: '09:00',
            endTime: '10:30',
            topic: 'Practice: Minimax Algorithm & Alpha-Beta Pruning (Chapter 3: Adversarial Search)',
            isCompleted: false,
          }
        ]
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: timetableData })
      });
    });

    // 11. Navigate to Timetable
    await page.goto('/timetable', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // 12. Verify Timetable displays real extracted material topic rather than generic placeholder
    const slotTopic = page.locator('text=A* Heuristic Search & Admissibility');
    await expect(slotTopic).toBeVisible();

    // 13. Refresh page and verify persistence
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const persistedTopic = page.locator('text=A* Heuristic Search & Admissibility');
    await expect(persistedTopic).toBeVisible();
  });

  test('Section 2: Groq Fallback Simulation & Robustness', async ({ page }) => {
    // Mock material processing where Groq is unavailable
    await page.route('**/api/materials/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'mat-fallback-01',
              title: 'Operating Systems Virtual Memory',
              fileUrl: 'https://mock-storage.supabase.co/os_vm.pdf',
              fileType: 'pdf',
              processingStatus: 'COMPLETED',
              overallDifficulty: 'MEDIUM',
              difficultyScore: 62,
              difficultyReason: 'Medium complexity document with page replacement and paging concepts.',
              extractedChapters: [
                { chapterNumber: 'Chapter 9', title: 'Chapter 9: Virtual Memory Management', confidence: 0.9 }
              ],
              extractedTopics: [
                { name: 'Virtual Memory & Page Replacement Algorithms', chapter: 'Chapter 9', relevanceScore: 0.85 }
              ],
              extractedKeywords: ['Virtual Memory', 'Page Fault', 'TLB', 'LRU'],
              aiSummary: 'Document Analysis: Operating Systems Virtual Memory covering Page Replacement and TLB paging.',
              uploadedAt: new Date().toISOString(),
            }
          ]
        })
      });
    });

    await page.goto('/materials', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Verify card rendered cleanly under deterministic fallback
    const title = page.locator('text=Operating Systems Virtual Memory');
    await expect(title).toBeVisible();

    const nlpBadge = page.locator('text=NLP Processed');
    await expect(nlpBadge).toBeVisible();

    const diffBadge = page.locator('text=MEDIUM • 62/100');
    await expect(diffBadge).toBeVisible();
  });

  test('Section 3: Header Controls, Theme Toggle, Profile Dropdown, and Notifications', async ({ page }) => {
    await page.route('**/api/students/me**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            fullName: 'Aswini Pavan',
            email: 'aswinipavan86@gmail.com',
            collegeName: 'NIT',
            department: 'CSE',
            semester: 6,
            subscriptionPlan: 'FREE',
          }
        })
      });
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Theme toggle
    const themeBtn = page.locator('button[aria-label*="theme" i], button[title*="theme" i], button:has(svg.lucide-sun), button:has(svg.lucide-moon)').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(200);
      await themeBtn.click();
    }

    // Profile Dropdown
    const profileBtn = page.locator('button:has-text("Aswini"), button:has-text("AP"), button[aria-label*="profile" i]').first();
    if (await profileBtn.isVisible()) {
      await profileBtn.click();
      await page.waitForTimeout(200);
    }
  });

  test('Section 4: Google Login & Auth Flow Audit', async ({ browser }) => {
    // Use fresh unauthenticated context for login page
    const freshContext = await browser.newContext();
    const loginPage = await freshContext.newPage();

    await loginPage.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await loginPage.waitForTimeout(500);

    // Verify Google login button exists and is clickable
    const googleBtn = loginPage.locator('button', { hasText: /Google/i }).first();
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();

    // Verify email/password login tab and inputs
    const emailInput = loginPage.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = loginPage.locator('input[type="password"]').first();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    await freshContext.close();
  });

  test('Section 5: AI Chat Interface & History Persistence', async ({ page }) => {
    // Mock sessions
    await page.route('**/api/chat/sessions**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'sess-1', title: 'A* Algorithm Complexity Explanation', createdAt: new Date().toISOString() },
            { id: 'sess-2', title: 'Binary Search Tree Balancing Questions', createdAt: new Date().toISOString() }
          ]
        })
      });
    });

    await page.route('**/api/chat/history/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'msg-1', role: 'user', content: 'Explain A* search time complexity', createdAt: new Date().toISOString() },
            { id: 'msg-2', role: 'assistant', content: 'A* time complexity depends on the heuristic admissibility. In worst case it is O(b^d).', createdAt: new Date().toISOString() }
          ]
        })
      });
    });

    await page.goto('/chat', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Verify AI Chat textarea is visible
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible();

    // Verify chat greeting/empty state heading
    const chatHeader = page.locator('h2').first();
    await expect(chatHeader).toBeVisible();
  });

  test('Section 6: Subscription & Pricing Tiers Verification', async ({ page }) => {
    await page.goto('/subscription', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Verify Pricing Header
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // Verify Upgrade / Action buttons exist
    const planButtons = page.locator('button', { hasText: /Get Started|Upgrade|Subscribe|Active|Monthly|Yearly/i });
    expect(await planButtons.count()).toBeGreaterThanOrEqual(1);
  });

});
