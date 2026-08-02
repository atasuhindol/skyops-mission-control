# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.ts >> SkyOps Mission Control E2E >> should complete full mission lifecycle: Create drone -> Schedule mission -> Progress mission -> Complete mission
- Location: tests/e2e.spec.ts:18:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at /home/apeiron/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```

```
TypeError: Cannot read properties of undefined (reading 'close')
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | const API_URL = 'http://localhost:3000/api';
  4   | const APP_URL = 'http://localhost:5173';
  5   | 
  6   | test.describe('SkyOps Mission Control E2E', () => {
  7   |   let page: Page;
  8   | 
  9   |   test.beforeEach(async ({ browser }) => {
  10  |     page = await browser.newPage();
  11  |     await page.goto(APP_URL);
  12  |   });
  13  | 
  14  |   test.afterEach(async () => {
> 15  |     await page.close();
      |                ^ TypeError: Cannot read properties of undefined (reading 'close')
  16  |   });
  17  | 
  18  |   test('should complete full mission lifecycle: Create drone -> Schedule mission -> Progress mission -> Complete mission', async () => {
  19  |     // Step 1: Navigate to Drones page
  20  |     await page.click('a:has-text("Drones")');
  21  |     await page.waitForURL('**/drones');
  22  | 
  23  |     // Step 2: Fill drone creation form
  24  |     const droneIdentifier = `DRONE-E2E-${Date.now()}`;
  25  |     const droneSerialNumber = `SKY-E2E${String(Date.now()).slice(-4)}-${String(Date.now()).slice(-4)}`;
  26  | 
  27  |     await page.fill('input[placeholder="Identifier"]', droneIdentifier);
  28  |     await page.fill('input[placeholder="Serial number"]', droneSerialNumber);
  29  |     await page.selectOption('select:nth-child(3)', 'PHANTOM_4');
  30  |     await page.selectOption('select:nth-child(4)', 'AVAILABLE');
  31  | 
  32  |     // Step 3: Submit drone creation
  33  |     await page.click('button:has-text("Create drone")');
  34  |     await page.waitForTimeout(500);
  35  | 
  36  |     // Step 4: Verify drone appears in list
  37  |     await expect(page.locator(`text=${droneIdentifier}`)).toBeVisible({ timeout: 5000 });
  38  | 
  39  |     // Step 5: Navigate to Missions page
  40  |     await page.click('a:has-text("Missions")');
  41  |     await page.waitForURL('**/missions');
  42  |     await page.waitForTimeout(500);
  43  | 
  44  |     // Step 6: Fill mission creation form
  45  |     const missionName = `MISSION-E2E-${Date.now()}`;
  46  |     const now = new Date();
  47  |     const startDateTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  48  |     const endDateTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  49  | 
  50  |     const startDateTimeLocal = startDateTime.toISOString().slice(0, 16);
  51  |     const endDateTimeLocal = endDateTime.toISOString().slice(0, 16);
  52  | 
  53  |     await page.fill('input[placeholder="Mission name"]', missionName);
  54  |     await page.selectOption('select:nth-child(2)', 'WIND_TURBINE_INSPECTION');
  55  | 
  56  |     // Select the drone we just created
  57  |     const droneSelect = page.locator('select:nth-child(3)');
  58  |     await droneSelect.evaluate((select: HTMLSelectElement) => {
  59  |       const option = Array.from(select.options).find((opt) => opt.textContent?.includes('DRONE-E2E'));
  60  |       if (option) (select as any).value = (option as any).value;
  61  |     });
  62  | 
  63  |     await page.fill('input[placeholder="Pilot name"]', 'E2E Pilot');
  64  |     await page.fill('input[placeholder="Site location"]', 'E2E Site');
  65  |     await page.fill('input[type="datetime-local"]:nth-child(6)', startDateTimeLocal);
  66  |     await page.fill('input[type="datetime-local"]:nth-child(7)', endDateTimeLocal);
  67  | 
  68  |     // Step 7: Submit mission creation
  69  |     await page.click('button:has-text("Schedule mission")');
  70  |     await page.waitForTimeout(500);
  71  | 
  72  |     // Step 8: Verify mission appears in queue
  73  |     const missionLocator = page.locator(`text=${missionName}`);
  74  |     await expect(missionLocator).toBeVisible({ timeout: 5000 });
  75  | 
  76  |     // Step 9: Get mission row and transition to PRE_FLIGHT_CHECK
  77  |     const missionRow = page.locator(`text=${missionName}`).first().locator('..');
  78  |     const preFlightButton = missionRow.locator('button:has-text("Pre-flight")').first();
  79  |     await preFlightButton.click();
  80  |     await page.waitForTimeout(300);
  81  | 
  82  |     // Step 10: Transition to IN_PROGRESS
  83  |     const startButton = missionRow.locator('button:has-text("Start")').first();
  84  |     await startButton.click();
  85  |     await page.waitForTimeout(300);
  86  | 
  87  |     // Step 11: Complete mission with flight hours
  88  |     const completeButton = missionRow.locator('button:has-text("Complete")').first();
  89  |     await completeButton.click();
  90  |     await page.waitForTimeout(300);
  91  | 
  92  |     // Step 12: Navigate to Dashboard to verify changes
  93  |     await page.click('a:has-text("Dashboard")');
  94  |     await page.waitForURL(APP_URL);
  95  |     await page.waitForTimeout(1000);
  96  | 
  97  |     // Step 13: Verify fleet overview displays data
  98  |     const totalDronesText = page.locator('text=/Total Drones|Drones/').first();
  99  |     await expect(totalDronesText).toBeVisible();
  100 | 
  101 |     // Step 14: Verify drone detail page shows updated mission
  102 |     await page.click('a:has-text("Drones")');
  103 |     await page.waitForURL('**/drones');
  104 |     await page.waitForTimeout(500);
  105 | 
  106 |     // Find and click the drone we created
  107 |     await page.locator(`text=${droneIdentifier}`).first().locator('..').locator('button:has-text("View")').click();
  108 |     await page.waitForTimeout(1000);
  109 | 
  110 |     // Verify mission appears in drone's mission history
  111 |     await expect(page.locator(`text=${missionName}`)).toBeVisible({ timeout: 5000 });
  112 | 
  113 |     // Verify mission status is COMPLETED
  114 |     await expect(page.locator('text=COMPLETED')).toBeVisible({ timeout: 5000 });
  115 |   });
```