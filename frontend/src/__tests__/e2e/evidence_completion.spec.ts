import { test, expect } from '@playwright/test';
import { setupAuthenticatedContext } from '../../../playwright/auth-setup';

test.describe('Evidence-Based Study Session Completion & AI Verification E2E', () => {
  const mockStudent = {
    id: 'stud-1',
    firebaseUid: 'mock-uid-evidence-spec',
    fullName: 'Aswini Lead',
    name: 'Aswini Lead',
    email: 'aswini@example.com',
    preferredStudyTime: 'EVENING',
    availableHoursPerDay: 1,
    isPremium: false,
  };

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const mockSlots = [
    {
      id: 'slot-today-1',
      subjectId: 'sub-net',
      subject: { id: 'sub-net', name: 'Computer Networks' },
      date: todayIso,
      dayOfWeek: (today.getDay() + 6) % 7,
      startTime: '17:00:00',
      endTime: '18:00:00',
      durationMinutes: 60,
      topic: 'TCP Handshake & Congestion Control',
      chapter: 'Transport Layer',
      materialTitle: 'Networks_Chapter3.pdf',
      materialId: 'mat-net-1',
      whatToStudy: [
        '• 3-way handshake SYN, SYN-ACK, ACK sequence',
        '• TCP Tahoe vs Reno congestion window dynamics',
      ],
      selectionReason: 'Core syllabus preparation for upcoming networks exam.',
      difficulty: 'MEDIUM',
      difficultyScore: 70,
      isCompleted: false,
      status: 'pending',
    },
    {
      id: 'slot-future-1',
      subjectId: 'sub-db',
      subject: { id: 'sub-db', name: 'Database Systems' },
      date: tomorrowIso,
      dayOfWeek: (tomorrow.getDay() + 6) % 7,
      startTime: '17:00:00',
      endTime: '18:00:00',
      durationMinutes: 60,
      topic: 'B-Tree & Hash Indexing',
      chapter: 'Storage and Indexing',
      materialTitle: 'DB_Indexing.pdf',
      materialId: 'mat-db-1',
      whatToStudy: ['• B+ Tree search, insertion, and split algorithms'],
      selectionReason: 'Database indexing fundamentals.',
      difficulty: 'HARD',
      difficultyScore: 85,
      isCompleted: false,
      status: 'pending',
    },
  ];

  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedContext(context, mockStudent as any);

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

    // Fallback wildcard route first
    await page.route('**/api/timetable/slots/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: null }),
      });
    });

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
          data: [
            { id: 'sub-net', name: 'Computer Networks', subjectName: 'Computer Networks' },
            { id: 'sub-db', name: 'Database Systems', subjectName: 'Database Systems' },
          ],
        }),
      });
    });

    await page.route('**/api/timetable/active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: {
            id: 'tt-evidence-1',
            weekStartDate: todayIso,
            isActive: true,
            isAiGenerated: true,
            slots: mockSlots,
          },
        }),
      });
    });

    await page.route('**/api/wake', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'awake' }) });
    });

    await page.route('**/api/notifications**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.route('**/api/timetable/insights**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });

    await page.route('**/api/timetable/readiness**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });

    // Specific evidence endpoints (registered last so they take precedence over wildcard)
    await page.route('**/api/timetable/slots/slot-today-1/evidence', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'OK',
            data: null,
          }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'OK',
            data: {
              id: 'evidence-ev-1',
              slotId: 'slot-today-1',
              fileName: 'tcp_proof.pdf',
              fileUrl: 'http://storage.local/evidence/tcp_proof.pdf',
              verificationStatus: 'APPROVED',
              score: 88,
              summary: 'Comprehensive notes demonstrating TCP 3-way handshake and congestion control window mechanics.',
              matchedTopics: ['TCP Handshake', 'Congestion Control'],
              missingTopics: [],
              feedback: 'Great step-by-step state diagrams and worked calculations.',
              confidence: 95,
              isUsedForCompletion: false,
            },
          }),
        });
      }
    });

    await page.route('**/api/timetable/slots/slot-today-1/approve-completion', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: {
            ...mockSlots[0],
            isCompleted: true,
            status: 'completed',
            hasEvidence: true,
            evidenceStatus: 'APPROVED',
            evidenceScore: 88,
            evidenceId: 'evidence-ev-1',
          },
        }),
      });
    });
  });

  test('completing a study session requires uploading proof and approved AI verification', async ({ page }) => {
    await page.goto('/timetable');

    // 1. Check Today's slot on timetable
    const todayCard = page.locator('[data-testid="slot-card-slot-today-1"]');
    await expect(todayCard).toBeVisible();

    // 2. Open details modal
    await todayCard.click();
    const modal = page.locator('[data-testid="slot-detail-modal"]');
    await expect(modal).toBeVisible();

    // 3. Verify dropzone is present in modal
    const dropzone = page.locator('[data-testid="modal-evidence-dropzone"]');
    await expect(dropzone).toBeVisible();
    await expect(page.getByText('Upload Study Proof / Notes')).toBeVisible();

    // 4. Upload mock study proof file
    const fileInput = page.locator('[data-testid="modal-evidence-file-input"]');
    await fileInput.setInputFiles({
      name: 'tcp_proof.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF Content demonstrating TCP 3-way handshake and congestion control curves'),
    });

    // 5. Verification result card renders with score and matched topics
    const verificationCard = page.locator('[data-testid="evidence-verification-card"]');
    await expect(verificationCard).toBeVisible();
    await expect(page.locator('[data-testid="verification-status-approved"]')).toContainText('APPROVED');
    await expect(page.locator('[data-testid="verification-score-pill"]')).toContainText('88/100');
    await expect(page.locator('[data-testid="verification-matched-topics"]')).toContainText('TCP Handshake');

    // 6. Click Approve & Complete Session
    const approveBtn = page.locator('[data-testid="modal-approve-and-complete-btn"]');
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // 7. Modal now reflects verified completion state
    const completedBadge = page.locator('[data-testid="modal-verified-completed"]');
    await expect(completedBadge).toBeVisible();
    await expect(page.getByText('Verified & Completed')).toBeVisible();
  });

  test('future session is locked and prevents proof submission or early completion', async ({ page }) => {
    await page.goto('/timetable');

    const futureCard = page.locator('[data-testid="slot-card-slot-future-1"]');
    await expect(futureCard).toBeVisible();

    // Future quick-toggle is disabled
    const futureToggle = page.locator('[data-testid="quick-toggle-slot-future-1"]');
    await expect(futureToggle).toBeDisabled();

    // Open future session modal
    await futureCard.click();
    const modal = page.locator('[data-testid="slot-detail-modal"]');
    await expect(modal).toBeVisible();

    // Verify locked banner and notice
    await expect(page.locator('[data-testid="modal-future-locked-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-evidence-locked"]')).toBeVisible();
    await expect(page.getByText(/Proof submission will unlock on the scheduled study date/i)).toBeVisible();

    const footerToggle = page.locator('[data-testid="modal-toggle-status-btn"]');
    await expect(footerToggle).toBeDisabled();
    await expect(footerToggle).toContainText('Locked (Future)');
  });
});
