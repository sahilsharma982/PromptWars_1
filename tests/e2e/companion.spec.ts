import { test, expect } from '@playwright/test';

test.describe('Companion Chat E2E', () => {
  test('should support keyboard focus, conversation creation, and message sending with agent visualization', async ({ page }) => {
    // Mock get conversations list (starts empty)
    await page.route('**/api/conversations', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'mock-conv-123', title: 'New chat' }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock GET messages for the conversation
    await page.route('**/api/conversations/mock-conv-123/messages', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock hive POST request
    await page.route('**/api/hive', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Hello! This is a response from the Academic and Wellness agents.',
          type: 'text',
          metadata: null,
          agents_invoked: [
            { key: 'academic', name: 'Academic Agent', emoji: '📚', summary: 'Mock academic plan.' },
            { key: 'wellness', name: 'Wellness Agent', emoji: '🌿', summary: 'Mock wellness strategy.' }
          ],
          meta: {
            provider: 'GEMINI',
            complexity: 'standard',
            tier: 'standard',
            orchestrator_reasoning: 'Orchestrating academic & wellness agents.'
          }
        }),
      });
    });

    await page.goto('/companion');

    // Verify chat elements are present
    const textarea = page.locator('textarea[placeholder="Message the Hive…"]');
    await expect(textarea).toBeVisible();

    // Verify keyboard shortcut focusing: ⌘K
    await page.keyboard.press('Meta+k');
    await expect(textarea).toBeFocused();

    // Send a message
    await textarea.fill('How can I study Mechanics better?');
    await page.click('role=button[name="Send message"]');

    // Wait for the response text to appear on the screen
    const replyText = page.locator('text=Hello! This is a response from the Academic and Wellness agents.');
    await expect(replyText).toBeVisible();

    // Verify agent visualizations are rendered in the message bubbles
    await expect(page.locator('text=Academic Agent')).toBeVisible();
    await expect(page.locator('text=Wellness Agent')).toBeVisible();
  });
});
