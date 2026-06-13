import { test, expect } from '@playwright/test';

test.describe('Syllabus Organizer E2E', () => {
  test('should load, mock AI parse, and display the syllabus tree correctly', async ({ page }) => {
    // Intercept POST request to mock AI parsing response
    await page.route('**/api/syllabus', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            model: 'mock-gemini-lite',
            tree: [
              {
                id: 'physics',
                name: 'Physics E2E',
                type: 'subject',
                weight: 'high',
                difficulty: 'hard',
                estimatedHours: 60,
                children: [
                  {
                    id: 'mechanics',
                    name: 'Mechanics Unit',
                    type: 'unit',
                    weight: 'high',
                    difficulty: 'medium',
                    estimatedHours: 30,
                    children: [
                      {
                        id: 'kinematics',
                        name: 'Kinematics Chapter',
                        type: 'chapter',
                        weight: 'medium',
                        difficulty: 'easy',
                        estimatedHours: 15,
                        children: []
                      }
                    ]
                  }
                ]
              }
            ]
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/syllabus');

    // Textarea is initialised empty
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue('');

    // Click 'Try demo'
    const tryDemoBtn = page.locator('button:has-text("Try demo")');
    await expect(tryDemoBtn).toBeVisible();
    await tryDemoBtn.click();

    // Verify textarea gets pre-filled with demo syllabus
    await expect(textarea).not.toHaveValue('');

    // Wait for the mock tree to load and verify the nodes are visible
    const subjectCard = page.locator('text=Physics E2E');
    await expect(subjectCard).toBeVisible();

    // Verify high impact badges and analytics elements
    const unitNode = page.locator('text=Mechanics Unit');
    await expect(unitNode).toBeVisible();

    // Check estimated hours render
    const hoursBadge = page.locator('text=60h total');
    await expect(hoursBadge).toBeVisible();
  });
});
