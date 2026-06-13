import { test, expect } from '@playwright/test';

test.describe('Integrations Page E2E', () => {
  test('should allow toggling Apple Watch and switching tabs to see activity details', async ({ page }) => {
    await page.goto('/integrations');

    // Locate the exact Apple Watch DeviceCard switch button using xpath ancestor relative to the title
    const watchSwitch = page
      .locator('p:text-is("Apple Watch")')
      .locator('xpath=ancestor::div[contains(@class, "bg-white")][1]')
      .locator('role=switch');

    await expect(watchSwitch).toBeVisible();
    await expect(watchSwitch).toHaveAttribute('aria-checked', 'false');

    // Click to toggle connection
    await watchSwitch.click();

    // Verify it connects (wait for mock loader and state updates)
    await expect(watchSwitch).toHaveAttribute('aria-checked', 'true', { timeout: 3000 });

    // Verify Apple Watch metrics now appear
    const watchCard = page.locator('p:text-is("Apple Watch")').locator('xpath=ancestor::div[contains(@class, "bg-white")][1]');
    await expect(watchCard.locator('p:text-is("Heart Rate")')).toBeVisible();
    await expect(watchCard.locator('text=62 BPM')).toBeVisible();

    // Verify default tab is Sleep and sleep summary cards show
    await expect(page.locator('text=Avg Sleep')).toBeVisible();
    await expect(page.locator('p:text-is("Wellness Agent")')).toBeVisible();

    // Switch to Screen Time tab
    await page.click('role=button[name="Screen Time"]');
    await expect(page.locator('text=YouTube')).toBeVisible();

    // Switch to Activity tab
    await page.click('role=button[name="Activity"]');
    await expect(page.locator('text=Activity Rings')).toBeVisible();
    await expect(page.locator('p:text-is("Heart Rate")').last()).toBeVisible();
  });
});
