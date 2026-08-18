import { test, expect } from '@playwright/test';
import * as path from 'path';

const PROD_URL = 'https://ai-study-planner-jhh9.vercel.app';
const ARTIFACTS_DIR = 'C:\\Users\\aswin\\.gemini\\antigravity-ide\\brain\\d97198a9-f775-44b6-846e-fb6f36081fb1';

test.describe('Live Production Deployment Audit', () => {

  test.beforeEach(async ({ context }) => {
    // Skip onboarding modal on production
    await context.addInitScript(() => {
      localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
      localStorage.setItem('studyplanner_onboarding_completed', 'true');
    });
  });

  test('Audit 1: Production Landing Page', async ({ page }) => {
    console.log(`[PROD AUDIT] Navigating to ${PROD_URL}...`);
    const response = await page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    expect(response?.status()).toBe(200);
    console.log(`[PROD AUDIT] Landing page returned HTTP ${response?.status()}`);

    // Verify Title & Hero
    const title = await page.title();
    console.log(`[PROD AUDIT] Page title: ${title}`);
    expect(title).toContain('AI Study Planner');

    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();
    const heroText = await heroHeading.textContent();
    console.log(`[PROD AUDIT] Hero Heading: "${heroText?.trim()}"`);

    // Verify Get Started Button
    const getStartedBtn = page.locator('a, button', { hasText: /Get Started|Start|Sign In/i }).first();
    await expect(getStartedBtn).toBeVisible();

    // Capture screenshot
    const screenshotPath = path.join(ARTIFACTS_DIR, 'production_landing_live.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`[PROD AUDIT] Saved screenshot to ${screenshotPath}`);
  });

  test('Audit 2: Production Login Page & OAuth UI', async ({ page }) => {
    const loginUrl = `${PROD_URL}/login`;
    console.log(`[PROD AUDIT] Navigating to ${loginUrl}...`);
    const response = await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    expect(response?.status()).toBe(200);
    console.log(`[PROD AUDIT] Login page returned HTTP ${response?.status()}`);

    // Verify Google Login Button
    const googleBtn = page.locator('button', { hasText: /Google/i }).first();
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();
    console.log(`[PROD AUDIT] Google login button is visible and enabled`);

    // Verify Email and Password Inputs
    const emailInput = page.locator('input[type="email"], input[placeholder*="example" i], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    console.log(`[PROD AUDIT] Email and password input fields are visible and responsive`);

    // Verify Submit Button
    const submitBtn = page.locator('button', { hasText: /Sign In|Log In/i }).first();
    await expect(submitBtn).toBeVisible();

    // Capture screenshot
    const screenshotPath = path.join(ARTIFACTS_DIR, 'production_login_live.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`[PROD AUDIT] Saved screenshot to ${screenshotPath}`);
  });

  test('Audit 3: Production Subscription & Pricing Tiers', async ({ page }) => {
    const subUrl = `${PROD_URL}/subscription`;
    console.log(`[PROD AUDIT] Navigating to ${subUrl}...`);
    const response = await page.goto(subUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    expect(response?.status()).toBe(200);
    console.log(`[PROD AUDIT] Subscription page returned HTTP ${response?.status()}`);

    // Verify Pricing Heading
    const pricingHeading = page.locator('h1, h2', { hasText: /Pricing|Plan|Subscription/i }).first();
    await expect(pricingHeading).toBeVisible();
    const headingText = await pricingHeading.textContent();
    console.log(`[PROD AUDIT] Pricing Heading: "${headingText?.trim()}"`);

    // Verify Pricing Tiers exist
    const planCards = page.locator('button, div', { hasText: /Free|Pro|Premium|Student/i });
    const count = await planCards.count();
    console.log(`[PROD AUDIT] Matching plan cards/elements: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);

    // Capture screenshot
    const screenshotPath = path.join(ARTIFACTS_DIR, 'production_subscription_live.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`[PROD AUDIT] Saved screenshot to ${screenshotPath}`);
  });

});
