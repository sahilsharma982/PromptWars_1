import { test, expect } from '@playwright/test';

test.describe('Integrations Page E2E', () => {
  test('should allow toggling Apple Watch and switching tabs to see activity details', async ({ page }) => {
    await page.goto('/integrations');

    // Verify Apple Watch card exists
    const watchCard = page.locator('div:has-text("Apple Watch")').first();
    await expect(watchCard).toBeVisible();

    // Verify Fitbit card exists
    const fitbitCard = page.locator('div:has-text("Fitbit")').first();
    await expect(fitbitCard).toBeVisible();

    // Apple Watch starts disconnected
    const watchSwitch = watchCard.locator('role=switch');
    await expect(watchSwitch).toBeVisible();
    await expect(watchSwitch).toHaveAttribute('aria-checked', 'false');

    // Click to toggle connection
    await watchSwitch.click();

    // Verify it connects (wait for mock loader and state updates)
    await expect(watchSwitch).toHaveAttribute('aria-checked', 'true', { timeout: 3000 });

    // Verify Apple Watch metrics now appear
    await expect(watchCard.locator('text=Heart Rate')).toBeVisible();
    await expect(watchCard.locator('text=62 BPM')).toBeVisible();

    // Verify default tab is Sleep and sleep summary cards show
    await expect(page.locator('text=Avg Sleep')).toBeVisible();
    await expect(page.locator('text=Wellness Agent')).toBeVisible();

    // Switch to Screen Time tab
    await page.click('role=button[name="Screen Time"]');
    await expect(page.locator('text=YouTube')).toBeVisible();

    // Switch to Activity tab
    await page.click('role=button[name="Activity"]');
    await expect(page.locator('text=Activity Rings')).toBeVisible();
    await expect(page.locator('text=Heart Rate')).toBeVisible();
  });
});
