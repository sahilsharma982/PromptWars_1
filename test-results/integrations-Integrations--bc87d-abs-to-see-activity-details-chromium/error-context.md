# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: integrations.spec.ts >> Integrations Page E2E >> should allow toggling Apple Watch and switching tabs to see activity details
- Location: tests/e2e/integrations.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('div:has-text("Apple Watch")').first().locator('role=switch')
Expected: visible
Error: strict mode violation: locator('div:has-text("Apple Watch")').first().locator('role=switch') resolved to 3 elements:
    1) <button role="switch" aria-checked="false" class="relative w-12 h-7 rounded-full transition-colors duration-200 bg-[#E5E5EA]">…</button> aka getByRole('switch').first()
    2) <button role="switch" aria-checked="false" class="relative w-12 h-7 rounded-full transition-colors duration-200 bg-[#E5E5EA]">…</button> aka getByRole('switch').nth(1)
    3) <button role="switch" aria-checked="false" class="relative w-12 h-7 rounded-full transition-colors duration-200 bg-[#E5E5EA]">…</button> aka getByRole('switch').nth(2)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('div:has-text("Apple Watch")').first().locator('role=switch')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - navigation "Main navigation" [ref=e3]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - link "MindSpace home" [ref=e7] [cursor=pointer]:
          - /url: /
          - generic [ref=e8]: MindSpace.
        - list [ref=e9]:
          - listitem [ref=e10] [cursor=pointer]: Dashboard
          - listitem [ref=e11] [cursor=pointer]: Calendar
          - listitem [ref=e12] [cursor=pointer]: Journal
          - listitem [ref=e13] [cursor=pointer]: Companion
          - listitem [ref=e14] [cursor=pointer]: Syllabus
          - listitem [ref=e15] [cursor=pointer]: Integrations
      - button "User profile" [ref=e17] [cursor=pointer]: S
  - main "Page content" [ref=e18]:
    - generic [ref=e19]:
      - generic [ref=e20]:
        - heading "Integrations" [level=1] [ref=e21]
        - paragraph [ref=e22]: Connect your devices · synced with Wellness Agent
      - generic [ref=e23]:
        - paragraph [ref=e24]: Devices
        - generic [ref=e26]:
          - generic [ref=e27]: ⌚️
          - generic [ref=e28]:
            - paragraph [ref=e29]: Apple Watch
            - paragraph [ref=e30]: Sleep stages · Heart rate · Activity rings
          - switch [ref=e31]
        - generic [ref=e34]:
          - generic [ref=e35]: 🩺
          - generic [ref=e36]:
            - paragraph [ref=e37]: Fitbit
            - paragraph [ref=e38]: SpO2 · HRV · Stress management score
          - switch [ref=e39]
        - generic [ref=e42]:
          - generic [ref=e43]: 📱
          - generic [ref=e44]:
            - paragraph [ref=e45]: Screen Time
            - paragraph [ref=e46]: iOS Screen Time · App usage · Pickups
          - switch [ref=e47]
      - generic [ref=e49]:
        - button "Sleep" [ref=e50]: Sleep
        - button "Screen Time" [ref=e52]
        - button "Activity" [ref=e53]
      - generic [ref=e54]:
        - generic [ref=e55]:
          - generic [ref=e56]:
            - paragraph [ref=e59]: 7.0h
            - paragraph [ref=e60]: Avg Sleep
          - generic [ref=e61]:
            - paragraph [ref=e64]: 4 of 7
            - paragraph [ref=e65]: Good Nights
          - generic [ref=e66]:
            - paragraph [ref=e69]: 12:17 AM
            - paragraph [ref=e70]: Bedtime
        - generic [ref=e71]:
          - generic [ref=e72]:
            - paragraph [ref=e73]: Sleep Duration
            - generic [ref=e74]:
              - generic [ref=e75]: Deep
              - generic [ref=e77]: REM
          - paragraph [ref=e79]: Hover to see sleep stages
          - generic [ref=e80]:
            - generic [ref=e81]:
              - generic [ref=e82]: Jun 13
              - generic [ref=e88]: 6.2h
              - generic [ref=e89]: Fair
            - generic [ref=e90]:
              - generic [ref=e91]: Jun 12
              - generic [ref=e97]: 7.8h
              - generic [ref=e98]: Good
            - generic [ref=e99]:
              - generic [ref=e100]: Jun 11
              - generic [ref=e106]: 5.1h
              - generic [ref=e107]: Poor
            - generic [ref=e108]:
              - generic [ref=e109]: Jun 10
              - generic [ref=e115]: 8.1h
              - generic [ref=e116]: Excellent
            - generic [ref=e117]:
              - generic [ref=e118]: Jun 9
              - generic [ref=e124]: 7.2h
              - generic [ref=e125]: Good
            - generic [ref=e126]:
              - generic [ref=e127]: Jun 8
              - generic [ref=e133]: 6.9h
              - generic [ref=e134]: Fair
            - generic [ref=e135]:
              - generic [ref=e136]: Jun 7
              - generic [ref=e142]: 7.5h
              - generic [ref=e143]: Good
        - generic [ref=e144]:
          - generic [ref=e145]:
            - paragraph [ref=e146]: Last Night · Jun 13
            - paragraph [ref=e147]: 1:15 AM → 7:24 AM
          - generic [ref=e148]:
            - generic [ref=e149]:
              - paragraph [ref=e151]: Deep Sleep
              - paragraph [ref=e152]: 67 min
              - generic [ref=e154]: 18%
            - generic [ref=e155]:
              - paragraph [ref=e157]: REM Sleep
              - paragraph [ref=e158]: 78 min
              - generic [ref=e160]: 21%
            - generic [ref=e161]:
              - paragraph [ref=e163]: Light Sleep
              - paragraph [ref=e164]: 205 min
              - generic [ref=e166]: 55%
        - generic [ref=e167]:
          - generic [ref=e168]: 🌿
          - generic [ref=e169]:
            - paragraph [ref=e170]: Wellness Agent
            - paragraph [ref=e171]: You averaged 7.0h of sleep this week — within the healthy 7–9h range. Consistent bedtimes are helping your memory consolidation and exam performance.
  - button "Open Next.js Dev Tools" [ref=e177] [cursor=pointer]:
    - img [ref=e178]
  - alert [ref=e181]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Integrations Page E2E', () => {
  4  |   test('should allow toggling Apple Watch and switching tabs to see activity details', async ({ page }) => {
  5  |     await page.goto('/integrations');
  6  | 
  7  |     // Verify Apple Watch card exists
  8  |     const watchCard = page.locator('div:has-text("Apple Watch")').first();
  9  |     await expect(watchCard).toBeVisible();
  10 | 
  11 |     // Verify Fitbit card exists
  12 |     const fitbitCard = page.locator('div:has-text("Fitbit")').first();
  13 |     await expect(fitbitCard).toBeVisible();
  14 | 
  15 |     // Apple Watch starts disconnected
  16 |     const watchSwitch = watchCard.locator('role=switch');
> 17 |     await expect(watchSwitch).toBeVisible();
     |                               ^ Error: expect(locator).toBeVisible() failed
  18 |     await expect(watchSwitch).toHaveAttribute('aria-checked', 'false');
  19 | 
  20 |     // Click to toggle connection
  21 |     await watchSwitch.click();
  22 | 
  23 |     // Verify it connects (wait for mock loader and state updates)
  24 |     await expect(watchSwitch).toHaveAttribute('aria-checked', 'true', { timeout: 3000 });
  25 | 
  26 |     // Verify Apple Watch metrics now appear
  27 |     await expect(watchCard.locator('text=Heart Rate')).toBeVisible();
  28 |     await expect(watchCard.locator('text=62 BPM')).toBeVisible();
  29 | 
  30 |     // Verify default tab is Sleep and sleep summary cards show
  31 |     await expect(page.locator('text=Avg Sleep')).toBeVisible();
  32 |     await expect(page.locator('text=Wellness Agent')).toBeVisible();
  33 | 
  34 |     // Switch to Screen Time tab
  35 |     await page.click('role=button[name="Screen Time"]');
  36 |     await expect(page.locator('text=YouTube')).toBeVisible();
  37 | 
  38 |     // Switch to Activity tab
  39 |     await page.click('role=button[name="Activity"]');
  40 |     await expect(page.locator('text=Activity Rings')).toBeVisible();
  41 |     await expect(page.locator('text=Heart Rate')).toBeVisible();
  42 |   });
  43 | });
  44 | 
```