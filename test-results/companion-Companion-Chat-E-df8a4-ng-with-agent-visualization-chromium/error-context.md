# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: companion.spec.ts >> Companion Chat E2E >> should support keyboard focus, conversation creation, and message sending with agent visualization
- Location: tests/e2e/companion.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Hello! This is a response from the Academic and Wellness agents.')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Hello! This is a response from the Academic and Wellness agents.')

```

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- navigation "Main navigation":
  - link "MindSpace home":
    - /url: /
    - text: MindSpace.
  - list:
    - listitem: Dashboard
    - listitem: Calendar
    - listitem: Journal
    - listitem: Companion
    - listitem: Syllabus
    - listitem: Integrations
  - button "User profile": S
- main "Page content":
  - complementary:
    - link "New chat":
      - /url: /companion
    - paragraph: Recent
    - link "How can I study Mechanics better? Just now":
      - /url: /companion/0725ab70-f7bc-4c96-bb55-d887a147bd7e
      - paragraph: How can I study Mechanics better?
      - paragraph: Just now
    - button "Delete conversation"
  - heading "How can I study Mechanics better?" [level=1]
  - paragraph: Hive of Minds · 5 specialist agents
  - button "Share"
  - text: Live S How can I study Mechanics better? 2:58 PM
  - textbox "Message the Hive…"
  - button "Send message" [disabled]
  - paragraph: Enter to send · Shift+Enter for new line · ⌘K to focus
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Companion Chat E2E', () => {
  4  |   test('should support keyboard focus, conversation creation, and message sending with agent visualization', async ({ page }) => {
  5  |     // Mock get conversations list (starts empty)
  6  |     await page.route('**/api/conversations', async (route) => {
  7  |       if (route.request().method() === 'GET') {
  8  |         await route.fulfill({
  9  |           status: 200,
  10 |           contentType: 'application/json',
  11 |           body: JSON.stringify([]),
  12 |         });
  13 |       } else if (route.request().method() === 'POST') {
  14 |         await route.fulfill({
  15 |           status: 200,
  16 |           contentType: 'application/json',
  17 |           body: JSON.stringify({ id: 'mock-conv-123', title: 'New chat' }),
  18 |         });
  19 |       } else {
  20 |         await route.continue();
  21 |       }
  22 |     });
  23 | 
  24 |     // Mock GET messages for the conversation
  25 |     await page.route('**/api/conversations/mock-conv-123/messages', async (route) => {
  26 |       await route.fulfill({
  27 |         status: 200,
  28 |         contentType: 'application/json',
  29 |         body: JSON.stringify([]),
  30 |       });
  31 |     });
  32 | 
  33 |     // Mock hive POST request
  34 |     await page.route('**/api/hive', async (route) => {
  35 |       await route.fulfill({
  36 |         status: 200,
  37 |         contentType: 'application/json',
  38 |         body: JSON.stringify({
  39 |           reply: 'Hello! This is a response from the Academic and Wellness agents.',
  40 |           type: 'text',
  41 |           metadata: null,
  42 |           agents_invoked: [
  43 |             { key: 'academic', name: 'Academic Agent', emoji: '📚', summary: 'Mock academic plan.' },
  44 |             { key: 'wellness', name: 'Wellness Agent', emoji: '🌿', summary: 'Mock wellness strategy.' }
  45 |           ],
  46 |           meta: {
  47 |             provider: 'GEMINI',
  48 |             complexity: 'standard',
  49 |             tier: 'standard',
  50 |             orchestrator_reasoning: 'Orchestrating academic & wellness agents.'
  51 |           }
  52 |         }),
  53 |       });
  54 |     });
  55 | 
  56 |     await page.goto('/companion');
  57 | 
  58 |     // Verify chat elements are present
  59 |     const textarea = page.locator('textarea[placeholder="Message the Hive…"]');
  60 |     await expect(textarea).toBeVisible();
  61 | 
  62 |     // Verify keyboard shortcut focusing: ⌘K
  63 |     await page.keyboard.press('Meta+k');
  64 |     await expect(textarea).toBeFocused();
  65 | 
  66 |     // Send a message
  67 |     await textarea.fill('How can I study Mechanics better?');
  68 |     await page.click('role=button[name="Send message"]');
  69 | 
  70 |     // Wait for the response text to appear on the screen
  71 |     const replyText = page.locator('text=Hello! This is a response from the Academic and Wellness agents.');
> 72 |     await expect(replyText).toBeVisible();
     |                             ^ Error: expect(locator).toBeVisible() failed
  73 | 
  74 |     // Verify agent visualizations are rendered in the message bubbles
  75 |     await expect(page.locator('text=Academic Agent')).toBeVisible();
  76 |     await expect(page.locator('text=Wellness Agent')).toBeVisible();
  77 |   });
  78 | });
  79 | 
```