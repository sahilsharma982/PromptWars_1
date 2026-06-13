import { test, expect } from '@playwright/test';

test.describe('Companion Chat E2E', () => {
  test('should support keyboard focus, conversation creation, and message sending with agent visualization', async ({ page }) => {
    // Intercept conversations routes using RegExp to match all collections, items, and subroutes
    await page.route(/\/api\/conversations/, async (route) => {
      const method = route.request().method();
      const url = route.request().url();
      const pathname = new URL(url).pathname.replace(/\/$/, ''); // strip trailing slash

      if (method === 'GET') {
        if (pathname.endsWith('/api/conversations')) {
          // List conversations (used by the sidebar)
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              conversations: [
                {
                  id: 'mock-conv-123',
                  title: 'New chat',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ],
              persisted: false
            }),
          });
        } else {
          // Single conversation GET /api/conversations/[id] (which loads messages)
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              conversation: {
                id: 'mock-conv-123',
                title: 'New chat',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              messages: [],
              persisted: false
            }),
          });
        }
      } else if (method === 'POST') {
        if (pathname.endsWith('/messages')) {
          // Post message POST /api/conversations/[id]/messages
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: { id: 'msg-1' }, persisted: false }),
          });
        } else {
          // Create conversation POST /api/conversations
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              conversation: {
                id: 'mock-conv-123',
                title: 'New chat',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              persisted: false
            }),
          });
        }
      } else {
        await route.continue();
      }
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

    // Navigate directly to the mock conversation page to ensure a stable single-page session
    await page.goto('/companion/mock-conv-123');

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
