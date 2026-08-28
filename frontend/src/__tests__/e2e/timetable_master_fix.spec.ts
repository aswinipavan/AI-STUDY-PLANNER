import { test, expect } from '@playwright/test';
import { setupAuthenticatedContext } from '../../../playwright/auth-setup';

test.describe('Timetable Master Fix E2E Verification', () => {
  const mockStartDate = '2026-08-27';
  const mockStudent = {
    id: 'stud-1',
    firebaseUid: 'mock-uid-tt-spec',
    fullName: 'Aswini Lead',
    name: 'Aswini Lead',
    email: 'aswini@example.com',
    preferredStudyTime: 'EVENING',
    availableHoursPerDay: 1,
    isPremium: false,
  };
  const mockSlots = [
    // Slot 1: Discrete Maths on Aug 27 (6:00 PM – 7:00 PM) - Missed past session
    {
      id: 'slot-aug27-1',
      subjectId: 'sub-dm',
      subject: { id: 'sub-dm', name: 'Discrete Maths' },
      date: '2026-08-27',
      dayOfWeek: 3,
      startTime: '18:00:00',
      endTime: '19:00:00',
      durationMinutes: 60,
      topic: 'Matrices - Determinant calculation',
      chapter: 'Matrices',
      materialTitle: 'Applied Mathematics Assignment.pdf',
      materialId: 'mat-1',
      whatToStudy: [
        '• Key definitions & terminology: determinant, 2x2, 3x3, rules',
        '• Chapter subtopics: Matrix representation, Determinant calculation',
        '• Core focus: Matrix fundamentals and determinants.',
        '• Work through practical examples and solved problems from Applied Mathematics Assignment.pdf',
      ],
      selectionReason: 'Progressive curriculum sequence from uploaded material: Applied Mathematics Assignment.pdf',
      examDeadline: '2026-09-10',
      examName: 'Final Exam',
      daysUntilExam: 14,
      difficulty: 'HARD',
      difficultyScore: 85,
      isCompleted: false,
      status: 'missed',
    },
    // Slot 2: Operating Systems on Aug 28 (6:00 PM – 7:00 PM) - Today's catch-up slot
    {
      id: 'slot-aug28-catchup',
      subjectId: 'sub-dm',
      subject: { id: 'sub-dm', name: 'Discrete Maths' },
      date: '2026-08-28',
      dayOfWeek: 4,
      startTime: '18:00:00',
      endTime: '19:00:00',
      durationMinutes: 60,
      topic: 'Matrices - Determinant calculation',
      chapter: 'Matrices',
      materialTitle: 'Applied Mathematics Assignment.pdf',
      materialId: 'mat-1',
      whatToStudy: [
        '• Key definitions & terminology: determinant, 2x2, 3x3, rules',
        '• Work through practical examples from Applied Mathematics Assignment.pdf',
      ],
      selectionReason: '🔴 Overdue Catch-up: Missed session from 2026-08-27 carried forward to stay on schedule before exams.',
      examDeadline: '2026-09-10',
      examName: 'Final Exam',
      daysUntilExam: 13,
      difficulty: 'HARD',
      difficultyScore: 85,
      isCompleted: false,
      isCatchUp: true,
      missedDate: '2026-08-27',
      notes: 'Rescheduled from 2026-08-27 (missed session caught up)',
      status: 'pending',
    },
    // Slot 3: Sep 3 (Thursday Week 2) - Shows Week 2 Thursday is distinct from Week 1 Thursday
    {
      id: 'slot-sep03-1',
      subjectId: 'sub-os',
      subject: { id: 'sub-os', name: 'Operating Systems' },
      date: '2026-09-03',
      dayOfWeek: 3,
      startTime: '18:00:00',
      endTime: '19:00:00',
      durationMinutes: 60,
      topic: 'Memory Management - Virtual Memory & Paging',
      chapter: 'Memory Management',
      materialTitle: 'OS Concepts Notes.pdf',
      materialId: 'mat-2',
      whatToStudy: ['• Paging vs Segmentation', '• Page fault handling mechanisms'],
      selectionReason: 'Progressive curriculum sequence',
      isCompleted: false,
      status: 'pending',
    },
  ];

  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedContext(context, mockStudent);

    await page.addInitScript((student) => {
      localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
      localStorage.setItem('auth-store', JSON.stringify({
        state: {
          user: student,
          isAuthenticated: true,
          isPremium: false,
        },
        version: 0,
      }));
    }, mockStudent);

    await page.route('**/api/students/me', async route => {
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

    await page.route('**/api/students/me/subjects', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: [
            { id: 'sub-dm', name: 'Discrete Maths', subjectName: 'Discrete Maths' },
            { id: 'sub-os', name: 'Operating Systems', subjectName: 'Operating Systems' },
          ],
        }),
      });
    });

    await page.route('**/api/timetable/active', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: {
            id: 'tt-master',
            weekStartDate: mockStartDate,
            isActive: true,
            isAiGenerated: true,
            slots: mockSlots,
          },
        }),
      });
    });

    await page.route('**/api/timetable/slots/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route('**/api/wake', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'awake' }) });
    });

    await page.route('**/api/notifications**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.route('**/api/timetable/insights**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });

    await page.route('**/api/timetable/readiness**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });
  });

  test('TF-01: Displays full calendar horizon with Month headers and date badges', async ({ page }) => {
    await page.goto('/timetable');

    // Calendar horizon header with Month and Range
    const horizonHeader = page.locator('[data-testid="calendar-horizon-header"]');
    await expect(horizonHeader).toBeVisible();
    await expect(page.locator('[data-testid="horizon-months-label"]')).toContainText(/AUGUST 2026/i);

    // Week navigation block is present
    await expect(page.locator('[data-testid="week-navigation-block"]')).toBeVisible();

    // Day headers have month tags and day numbers
    const aug27Header = page.locator('[data-testid="day-header-2026-08-27"]');
    await expect(aug27Header).toBeVisible();
    await expect(aug27Header).toContainText('AUG');
    await expect(aug27Header).toContainText(/thu/i);
    await expect(aug27Header).toContainText('27');
  });

  test('TF-02: Displays slot with full start-end time range (6:00 PM – 7:00 PM)', async ({ page }) => {
    await page.goto('/timetable');

    const slotTime = page.locator('[data-testid="slot-time-slot-aug27-1"]');
    await expect(slotTime).toBeVisible();
    await expect(slotTime).toContainText(/6:00 PM – 7:00 PM/i);
  });

  test('TF-03: Clicking slot opens SlotDetailModal with source material, chapter, and what to study', async ({ page }) => {
    await page.goto('/timetable');

    // Click on Slot 1
    const slotCard = page.locator('[data-testid="slot-card-slot-aug27-1"]');
    await slotCard.click();

    // Verify Modal is opened
    const modal = page.locator('[data-testid="slot-detail-modal"]');
    await expect(modal).toBeVisible();

    // Assert rich content
    await expect(page.locator('[data-testid="modal-topic-title"]')).toHaveText('Matrices - Determinant calculation');
    await expect(page.locator('[data-testid="modal-chapter-name"]')).toHaveText('Matrices');
    await expect(page.locator('[data-testid="modal-source-material"]')).toHaveText('Applied Mathematics Assignment.pdf');
    await expect(page.locator('[data-testid="modal-difficulty"]')).toContainText('HARD · 85/100');

    // What to Study bullets
    await expect(page.locator('[data-testid="modal-what-to-study-list"]')).toContainText(/Key definitions & terminology/i);

    // Exam urgency
    await expect(page.locator('[data-testid="modal-exam-deadline"]')).toContainText(/Final Exam/i);
    await expect(page.locator('[data-testid="modal-exam-deadline"]')).toContainText(/14 days away/i);

    // Close modal
    await page.locator('[data-testid="close-slot-modal-btn"]').click();
    await expect(modal).not.toBeVisible();
  });

  test('TF-04: Missed session shows red missed indicator and alert banner', async ({ page }) => {
    await page.goto('/timetable');

    // Missed banner at top of page
    const missedBanner = page.locator('[data-testid="missed-sessions-alert-banner"]');
    await expect(missedBanner).toBeVisible();
    await expect(missedBanner).toContainText(/MISSED SESSIONS REQUIRE ATTENTION/i);

    // Historical missed badge on Aug 27 slot
    const missedBadge = page.locator('[data-testid="slot-card-slot-aug27-1"] [data-testid="missed-badge"]');
    await expect(missedBadge).toBeVisible();
    await expect(missedBadge).toHaveText(/🔴 MISSED/i);
  });

  test('TF-05: Next-day catch-up slot shows 🔴 MISSED — COMPLETE TODAY badge', async ({ page }) => {
    await page.goto('/timetable');

    // Catch-up badge on Aug 28 slot
    const catchUpBadge = page.locator('[data-testid="slot-card-slot-aug28-catchup"] [data-testid="catchup-badge"]');
    await expect(catchUpBadge).toBeVisible();
    await expect(catchUpBadge).toHaveText(/🔴 MISSED — COMPLETE TODAY/i);
  });

  test('TF-06: Switching to All Weeks view reveals Week 2 without date collision', async ({ page }) => {
    await page.goto('/timetable');

    // Click "All Weeks View"
    const allWeeksTab = page.locator('[data-testid="quick-jump-all-weeks"]');
    await allWeeksTab.click();

    // Verify Sep 3 (Week 2 Thursday) is rendered in its own column
    const sep03Header = page.locator('[data-testid="day-header-2026-09-03"]');
    await expect(sep03Header).toBeVisible();
    await expect(sep03Header).toContainText('SEP');
    await expect(sep03Header).toContainText('3');

    // Verify Slot 3 is rendered under Sep 03
    const slot3 = page.locator('[data-testid="slot-card-slot-sep03-1"]');
    await expect(slot3).toBeVisible();
    await expect(slot3).toContainText('Operating Systems');
    await expect(slot3).toContainText('Virtual Memory');
  });
});
