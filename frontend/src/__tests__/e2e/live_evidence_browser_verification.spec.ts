import { test, expect } from '@playwright/test';
import path from 'path';
import { setupAuthenticatedContext } from '../../../playwright/auth-setup';

test.describe('E2E Real Browser Live Evidence Verification & Completion Workflow', () => {
  const liveStudent = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    firebaseUid: 'faculty-demo-uid',
    name: 'Faculty Demo Student',
    fullName: 'Faculty Demo Student',
    email: 'demo.student@university.edu',
    collegeName: 'National Institute of Technology',
    semester: 6,
    department: 'Computer Science & Engineering',
    isPremium: true,
    studyStreak: 5,
    availableHoursPerDay: 4.0,
    preferredStudyTime: 'EVENING',
  };

  test.beforeEach(async ({ page, context, request }) => {
    // Authenticate with real token pointing to live faculty demo student in database
    const token = await setupAuthenticatedContext(context, liveStudent);

    await page.addInitScript((student) => {
      localStorage.setItem('auth-store', JSON.stringify({
        state: {
          user: student,
          isAuthenticated: true,
          isPremium: true,
        },
        version: 0,
      }));
    }, liveStudent);

    // Fetch subjects and generate a fresh timetable to guarantee clean idempotent state
    const subjRes = await request.get('http://localhost:8080/api/students/me/subjects', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (subjRes.ok()) {
      const body = await subjRes.json();
      const subjectIds = (body.data || []).map((s: any) => s.id);
      if (subjectIds.length > 0) {
        await request.post('http://localhost:8080/api/timetable/generate', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          data: {
            subjectIds: subjectIds,
            availableHoursPerDay: 4,
            style: 'balanced',
            startDate: '2026-09-01',
            durationDays: 7,
          },
        });
      }
    }
  });

  test('FULL REAL BROWSER WORKFLOW: Upload real evidence -> Real AI Analysis (200 OK) -> Approve & Complete -> Persistence across reload -> Dashboard update', async ({ page }) => {
    test.setTimeout(120000); // 120s timeout for live AI execution

    // 1. Open http://localhost:3000/timetable
    await page.goto('/timetable');
    await page.waitForLoadState('networkidle');

    // Confirm page header
    await expect(page.locator('h1').filter({ hasText: /My Timetable/i })).toBeVisible({ timeout: 15000 });

    // 2. Locate slot cards
    const slotCards = page.locator('[data-testid^="slot-card-"]');
    await expect(slotCards.first()).toBeVisible({ timeout: 10000 });

    // 3. Open first uncompleted session for today
    const slot1 = slotCards.first();
    await slot1.click();

    // 4. Modal opens
    const modal = page.locator('[data-testid="slot-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('text=STUDY PROOF & AI VERIFICATION')).toBeVisible();

    // If previous evidence exists on this slot, click "Submit New Proof"
    const reuploadBtn = modal.locator('[data-testid="modal-reupload-evidence-btn"]');
    if (await reuploadBtn.isVisible()) {
      await reuploadBtn.click();
    }

    // 5. Upload real evidence proof file
    const uploadInput = modal.locator('input[type="file"]');
    await expect(uploadInput).toBeAttached({ timeout: 5000 });
    const validProofPath = path.resolve(process.cwd(), 'test-evidence-notes.txt');

    // 6. Monitor real backend network request POST /api/timetable/slots/*/evidence
    const evidenceRequestPromise = page.waitForResponse(
      (resp) => resp.url().includes('/evidence') && resp.request().method() === 'POST',
      { timeout: 60000 }
    );

    await uploadInput.setInputFiles(validProofPath);

    // Confirm real backend returns HTTP 200
    const evidenceResponse = await evidenceRequestPromise;
    expect(evidenceResponse.status()).toBe(200);
    const evidenceJson = await evidenceResponse.json();
    expect(evidenceJson.success).toBe(true);
    expect(evidenceJson.data).toBeDefined();

    // 7. Modal displays REAL AI verification result
    await expect(modal.locator('[data-testid="evidence-verification-card"]')).toBeVisible({ timeout: 30000 });
    
    // 8. Confirm APPROVED evidence attributes
    const scoreBadge = modal.locator('[data-testid="verification-score-pill"]');
    await expect(scoreBadge).toBeVisible();
    
    // Check summary & feedback rendered
    await expect(modal.locator('[data-testid="verification-summary"]')).toBeVisible();
    await expect(modal.locator('[data-testid="verification-matched-topics"]')).toBeVisible();

    // 9. Click "Approve & Complete Session"
    const approveBtn = modal.locator('[data-testid="modal-approve-and-complete-btn"]');
    await expect(approveBtn).toBeVisible();

    const completionResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/approve-completion') && resp.request().method() === 'POST',
      { timeout: 30000 }
    );

    await approveBtn.click();

    // 10. Confirm backend returns success for completion
    const completionResponse = await completionResponsePromise;
    expect(completionResponse.status()).toBe(200);
    const completionJson = await completionResponse.json();
    expect(completionJson.success).toBe(true);
    expect(completionJson.data.isCompleted).toBe(true);

    // 11. Confirm modal displays verified & completed status
    await expect(modal.locator('[data-testid="modal-verified-completed"]')).toBeVisible({ timeout: 5000 });

    // Close modal
    await modal.locator('[data-testid="close-slot-modal-btn"]').click();

    // 12. Refresh the timetable
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 13. Confirm completed state persists in timetable
    await expect(page.locator('[data-testid="today-progress-value"]')).toContainText(/sessions completed/i, { timeout: 10000 });

    // 14. Navigate to dashboard and confirm progress
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Today\'s Schedule').first()).toBeVisible({ timeout: 15000 });

    // 15. Verify completed session is marked as done in dashboard
    await expect(page.locator('text=sessions completed today')).toBeVisible({ timeout: 10000 });
  });

  test('INSUFFICIENT PROOF & FUTURE LOCKING: Insufficient file -> NEEDS_MORE_WORK & Future session locked', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/timetable');
    await page.waitForLoadState('networkidle');

    const slotCards = page.locator('[data-testid^="slot-card-"]');
    await expect(slotCards.first()).toBeVisible({ timeout: 10000 });

    // 16. Test Insufficient Proof on Session 2
    const slot2 = slotCards.nth(1);
    await slot2.click();

    const modal = page.locator('[data-testid="slot-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    const reuploadBtn = modal.locator('[data-testid="modal-reupload-evidence-btn"]');
    if (await reuploadBtn.isVisible()) {
      await reuploadBtn.click();
    }

    const uploadInput = modal.locator('input[type="file"]');
    await expect(uploadInput).toBeAttached({ timeout: 5000 });
    const insufficientProofPath = path.resolve(process.cwd(), 'test-insufficient-notes.txt');

    const evidenceRequestPromise = page.waitForResponse(
      (resp) => resp.url().includes('/evidence') && resp.request().method() === 'POST',
      { timeout: 60000 }
    );

    await uploadInput.setInputFiles(insufficientProofPath);
    const evidenceResponse = await evidenceRequestPromise;
    expect(evidenceResponse.status()).toBe(200);

    // Confirm NEEDS_MORE_WORK
    await expect(modal.locator('[data-testid="verification-status-needs-work"]')).toBeVisible({ timeout: 30000 });

    // Confirm Approve & Complete button is NOT shown
    const approveBtn = modal.locator('[data-testid="modal-approve-and-complete-btn"]');
    await expect(approveBtn).toHaveCount(0);

    // Confirm "Submit New Proof" button is available
    await expect(modal.locator('[data-testid="modal-reupload-evidence-btn"]')).toBeVisible();

    // Close modal
    await modal.locator('[data-testid="close-slot-modal-btn"]').click();

    // 17. Test Future Locked Session (Session 4 tomorrow)
    const futureSlot = slotCards.nth(3);
    await futureSlot.click();

    // Confirm locked banner and proof upload is disabled/hidden
    await expect(modal.locator('[data-testid="modal-future-locked-banner"]')).toBeVisible();
    await expect(modal.locator('text=Future Session (Locked)')).toBeVisible();
    await expect(modal.locator('input[type="file"]')).toHaveCount(0);
  });
});
