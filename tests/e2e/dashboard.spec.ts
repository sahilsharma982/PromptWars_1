import { test, expect } from '@playwright/test';

test.describe('Dashboard & Navigation', () => {
  test('should load the dashboard and verify key elements', async ({ page }) => {
    // Start on dashboard page
    await page.goto('/dashboard');

    // Check header text or dashboard indicator
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    // Check navbar existence and links
    const navbar = page.locator('nav[aria-label="Main navigation"]');
    await expect(navbar).toBeVisible();

    // Verify main semantic container is present
    const mainContainer = page.locator('main');
    await expect(mainContainer).toBeVisible();
  });

  test('should navigate between tabs successfully', async ({ page }) => {
    await page.goto('/dashboard');

    // Go to Syllabus page via Navbar link click
    await page.click('role=link[name="Syllabus"]');
    await expect(page).toHaveURL(/\/syllabus/);

    // Go to Companion page
    await page.click('role=link[name="Companion"]');
    await expect(page).toHaveURL(/\/companion/);

    // Go to Calendar page
    await page.click('role=link[name="Calendar"]');
    await expect(page).toHaveURL(/\/calendar/);
  });
});
