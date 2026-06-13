# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: syllabus.spec.ts >> Syllabus Organizer E2E >> should load, mock AI parse, and display the syllabus tree correctly
- Location: tests/e2e/syllabus.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=60h total')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=60h total')

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
  - heading "Syllabus Organizer" [level=1]
  - paragraph: Paste raw text → AI builds an interactive study tree
  - button "Export"
  - button "Clear"
  - 'textbox "Paste your syllabus here… Example: Physics - JEE Advanced Unit 1: Mechanics Kinematics, Laws of Motion Unit 2: Thermodynamics Kinetic Theory, Carnot Cycle"':
    - /placeholder: "Paste your syllabus here…\n\nExample:\nPhysics - JEE Advanced\n  Unit 1: Mechanics\n    Kinematics, Laws of Motion\n  Unit 2: Thermodynamics\n    Kinetic Theory, Carnot Cycle"
    - text: "Physics - JEE Advanced 2027 Unit 1: Mechanics Chapter 1: Kinematics - Motion in 1D, Projectile, Circular Motion Chapter 2: Laws of Motion - Newton's Laws, Friction, Pulleys Chapter 3: Work Energy Theorem, Conservation Laws Unit 2: Thermodynamics Chapter 4: Kinetic Theory of Gases Chapter 5: Thermodynamic Processes - Carnot Cycle, Entropy Mathematics - JEE Advanced 2027 Unit 1: Calculus Limits, Continuity, Differentiability Integration - Indefinite, Definite, Applications Differential Equations Unit 2: Algebra Complex Numbers, Matrices & Determinants Permutation, Combination, Binomial Theorem"
  - text: or drag a file
  - button "Organise with AI"
  - button "Try demo"
  - paragraph: "1"
  - paragraph: Subjects
  - paragraph: "1"
  - paragraph: Topics
  - paragraph: 105h
  - paragraph: Est. hours
  - paragraph: Content Tree
  - text: subject unit chapter topic H M L
  - button "Physics E2E 60h 1":
    - paragraph: Physics E2E
    - text: 60h 1
  - button "Mechanics Unit High 30h 1"
  - button "Kinematics Chapter Medium 15h"
  - button "Schedule across Calendar"
  - button "Re-analyse"
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Syllabus Organizer E2E', () => {
  4  |   test('should load, mock AI parse, and display the syllabus tree correctly', async ({ page }) => {
  5  |     // Intercept POST request to mock AI parsing response
  6  |     await page.route('**/api/syllabus', async (route) => {
  7  |       if (route.request().method() === 'POST') {
  8  |         await route.fulfill({
  9  |           status: 200,
  10 |           contentType: 'application/json',
  11 |           body: JSON.stringify({
  12 |             model: 'mock-gemini-lite',
  13 |             tree: [
  14 |               {
  15 |                 id: 'physics',
  16 |                 name: 'Physics E2E',
  17 |                 type: 'subject',
  18 |                 weight: 'high',
  19 |                 difficulty: 'hard',
  20 |                 estimatedHours: 60,
  21 |                 children: [
  22 |                   {
  23 |                     id: 'mechanics',
  24 |                     name: 'Mechanics Unit',
  25 |                     type: 'unit',
  26 |                     weight: 'high',
  27 |                     difficulty: 'medium',
  28 |                     estimatedHours: 30,
  29 |                     children: [
  30 |                       {
  31 |                         id: 'kinematics',
  32 |                         name: 'Kinematics Chapter',
  33 |                         type: 'chapter',
  34 |                         weight: 'medium',
  35 |                         difficulty: 'easy',
  36 |                         estimatedHours: 15,
  37 |                         children: []
  38 |                       }
  39 |                     ]
  40 |                   }
  41 |                 ]
  42 |               }
  43 |             ]
  44 |           }),
  45 |         });
  46 |       } else {
  47 |         await route.continue();
  48 |       }
  49 |     });
  50 | 
  51 |     await page.goto('/syllabus');
  52 | 
  53 |     // Textarea is initialised empty
  54 |     const textarea = page.locator('textarea');
  55 |     await expect(textarea).toBeVisible();
  56 |     await expect(textarea).toHaveValue('');
  57 | 
  58 |     // Click 'Try demo'
  59 |     const tryDemoBtn = page.locator('button:has-text("Try demo")');
  60 |     await expect(tryDemoBtn).toBeVisible();
  61 |     await tryDemoBtn.click();
  62 | 
  63 |     // Verify textarea gets pre-filled with demo syllabus
  64 |     await expect(textarea).not.toHaveValue('');
  65 | 
  66 |     // Wait for the mock tree to load and verify the nodes are visible
  67 |     const subjectCard = page.locator('text=Physics E2E');
  68 |     await expect(subjectCard).toBeVisible();
  69 | 
  70 |     // Verify high impact badges and analytics elements
  71 |     const unitNode = page.locator('text=Mechanics Unit');
  72 |     await expect(unitNode).toBeVisible();
  73 | 
  74 |     // Check estimated hours render
  75 |     const hoursBadge = page.locator('text=60h total');
> 76 |     await expect(hoursBadge).toBeVisible();
     |                              ^ Error: expect(locator).toBeVisible() failed
  77 |   });
  78 | });
  79 | 
```