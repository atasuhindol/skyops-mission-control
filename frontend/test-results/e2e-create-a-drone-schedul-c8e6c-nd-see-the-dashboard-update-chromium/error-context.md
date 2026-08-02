# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.ts >> create a drone, schedule a mission, and see the dashboard update
- Location: tests\e2e.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('E2E Drone')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('E2E Drone')

```

```yaml
- navigation:
  - heading "Drone registry" [level=1]
  - link "Dashboard":
    - /url: /
  - link "Drones":
    - /url: /drones
  - link "Missions":
    - /url: /missions
- heading "Create drone" [level=3]
- textbox "Identifier"
- textbox "Serial number"
- combobox:
  - option "PHANTOM_4" [selected]
  - option "MATRICE_300"
  - option "MAVIC_3_ENTERPRISE"
- combobox:
  - option "AVAILABLE" [selected]
  - option "IN_MISSION"
  - option "MAINTENANCE"
  - option "RETIRED"
- button "Create drone"
- heading "Fleet inventory" [level=3]
- list
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test('create a drone, schedule a mission, and see the dashboard update', async ({ page }) => {
  4  |   await page.goto('/drones');
  5  |   await page.getByPlaceholder('Identifier').fill('E2E Drone');
  6  |   await page.getByPlaceholder('Serial number').fill('SKY-9999-ZZZZ');
  7  |   await page.locator('select').first().selectOption('MATRICE_300');
  8  |   await page.locator('select').nth(1).selectOption('AVAILABLE');
  9  |   await page.getByRole('button', { name: 'Create drone' }).click();
> 10 |   await expect(page.getByText('E2E Drone')).toBeVisible();
     |                                             ^ Error: expect(locator).toBeVisible() failed
  11 | 
  12 |   await page.goto('/missions');
  13 |   await page.getByPlaceholder('Mission name').fill('E2E inspection');
  14 |   await page.locator('select').nth(0).selectOption('WIND_TURBINE_INSPECTION');
  15 |   await page.locator('select').nth(1).selectOption({ label: 'E2E Drone' });
  16 |   await page.getByPlaceholder('Pilot name').fill('Pilot 42');
  17 |   await page.getByPlaceholder('Site location').fill('North Tower');
  18 |   const plannedStart = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);
  19 |   const plannedEnd = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
  20 |   await page.locator('input[type="datetime-local"]').first().fill(plannedStart);
  21 |   await page.locator('input[type="datetime-local"]').last().fill(plannedEnd);
  22 |   await page.getByRole('button', { name: 'Schedule mission' }).click();
  23 |   await expect(page.getByText('E2E inspection')).toBeVisible();
  24 | 
  25 |   await page.getByRole('button', { name: 'Start' }).click();
  26 |   await page.getByRole('button', { name: 'Complete' }).click();
  27 |   await page.goto('/');
  28 |   await expect(page.getByText('1 missions next 24h')).toBeVisible();
  29 | });
  30 | 
```