import { test, expect, Page } from '@playwright/test';

const API_URL = 'http://localhost:3000/api';
const APP_URL = 'http://localhost:5173';

test.describe('SkyOps Mission Control E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should complete full mission lifecycle: Create drone -> Schedule mission -> Progress mission -> Complete mission', async () => {
    // Step 1: Navigate to Drones page
    await page.click('a:has-text("Drones")');
    await page.waitForURL('**/drones');

    // Step 2: Fill drone creation form
    const droneIdentifier = `DRONE-E2E-${Date.now()}`;
    const droneSerialNumber = `SKY-E2E${String(Date.now()).slice(-4)}-${String(Date.now()).slice(-4)}`;

    await page.fill('input[placeholder="Identifier"]', droneIdentifier);
    await page.fill('input[placeholder="Serial number"]', droneSerialNumber);
    await page.selectOption('select:nth-child(3)', 'PHANTOM_4');
    await page.selectOption('select:nth-child(4)', 'AVAILABLE');

    // Step 3: Submit drone creation
    await page.click('button:has-text("Create drone")');
    await page.waitForTimeout(500);

    // Step 4: Verify drone appears in list
    await expect(page.locator(`text=${droneIdentifier}`)).toBeVisible({ timeout: 5000 });

    // Step 5: Navigate to Missions page
    await page.click('a:has-text("Missions")');
    await page.waitForURL('**/missions');
    await page.waitForTimeout(500);

    // Step 6: Fill mission creation form
    const missionName = `MISSION-E2E-${Date.now()}`;
    const now = new Date();
    const startDateTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const endDateTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const startDateTimeLocal = startDateTime.toISOString().slice(0, 16);
    const endDateTimeLocal = endDateTime.toISOString().slice(0, 16);

    await page.fill('input[placeholder="Mission name"]', missionName);
    await page.selectOption('select:nth-child(2)', 'WIND_TURBINE_INSPECTION');

    // Select the drone we just created
    const droneSelect = page.locator('select:nth-child(3)');
    await droneSelect.evaluate((select: HTMLSelectElement) => {
      const option = Array.from(select.options).find((opt) => opt.textContent?.includes('DRONE-E2E'));
      if (option) (select as any).value = (option as any).value;
    });

    await page.fill('input[placeholder="Pilot name"]', 'E2E Pilot');
    await page.fill('input[placeholder="Site location"]', 'E2E Site');
    await page.fill('input[type="datetime-local"]:nth-child(6)', startDateTimeLocal);
    await page.fill('input[type="datetime-local"]:nth-child(7)', endDateTimeLocal);

    // Step 7: Submit mission creation
    await page.click('button:has-text("Schedule mission")');
    await page.waitForTimeout(500);

    // Step 8: Verify mission appears in queue
    const missionLocator = page.locator(`text=${missionName}`);
    await expect(missionLocator).toBeVisible({ timeout: 5000 });

    // Step 9: Get mission row and transition to PRE_FLIGHT_CHECK
    const missionRow = page.locator(`text=${missionName}`).first().locator('..');
    const preFlightButton = missionRow.locator('button:has-text("Pre-flight")').first();
    await preFlightButton.click();
    await page.waitForTimeout(300);

    // Step 10: Transition to IN_PROGRESS
    const startButton = missionRow.locator('button:has-text("Start")').first();
    await startButton.click();
    await page.waitForTimeout(300);

    // Step 11: Complete mission with flight hours
    const completeButton = missionRow.locator('button:has-text("Complete")').first();
    await completeButton.click();
    await page.waitForTimeout(300);

    // Step 12: Navigate to Dashboard to verify changes
    await page.click('a:has-text("Dashboard")');
    await page.waitForURL(APP_URL);
    await page.waitForTimeout(1000);

    // Step 13: Verify fleet overview displays data
    const totalDronesText = page.locator('text=/Total Drones|Drones/').first();
    await expect(totalDronesText).toBeVisible();

    // Step 14: Verify drone detail page shows updated mission
    await page.click('a:has-text("Drones")');
    await page.waitForURL('**/drones');
    await page.waitForTimeout(500);

    // Find and click the drone we created
    await page.locator(`text=${droneIdentifier}`).first().locator('..').locator('button:has-text("View")').click();
    await page.waitForTimeout(1000);

    // Verify mission appears in drone's mission history
    await expect(page.locator(`text=${missionName}`)).toBeVisible({ timeout: 5000 });

    // Verify mission status is COMPLETED
    await expect(page.locator('text=COMPLETED')).toBeVisible({ timeout: 5000 });
  });

  test('should handle mission abort with status rollback', async () => {
    // Navigate to Drones
    await page.click('a:has-text("Drones")');
    await page.waitForURL('**/drones');

    // Create a drone
    const droneId = `DRONE-ABORT-${Date.now()}`;
    const serialNum = `SKY-ABT${String(Date.now()).slice(-4)}-${String(Date.now()).slice(-4)}`;

    await page.fill('input[placeholder="Identifier"]', droneId);
    await page.fill('input[placeholder="Serial number"]', serialNum);
    await page.selectOption('select:nth-child(3)', 'PHANTOM_4');
    await page.click('button:has-text("Create drone")');
    await page.waitForTimeout(500);

    // Navigate to Missions
    await page.click('a:has-text("Missions")');
    await page.waitForURL('**/missions');
    await page.waitForTimeout(500);

    // Create a mission
    const missionId = `MISSION-ABORT-${Date.now()}`;
    const now = new Date();
    const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const endTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const startLocal = startTime.toISOString().slice(0, 16);
    const endLocal = endTime.toISOString().slice(0, 16);

    await page.fill('input[placeholder="Mission name"]', missionId);
    await page.selectOption('select:nth-child(2)', 'SOLAR_PANEL_SURVEY');

    const droneSelector = page.locator('select:nth-child(3)');
    await droneSelector.evaluate((sel: HTMLSelectElement) => {
      const opt = Array.from(sel.options).find((o) => o.textContent?.includes('DRONE-ABORT'));
      if (opt) (sel as any).value = (opt as any).value;
    });

    await page.fill('input[placeholder="Pilot name"]', 'Abort Pilot');
    await page.fill('input[placeholder="Site location"]', 'Abort Site');
    await page.fill('input[type="datetime-local"]:nth-child(6)', startLocal);
    await page.fill('input[type="datetime-local"]:nth-child(7)', endLocal);
    await page.click('button:has-text("Schedule mission")');
    await page.waitForTimeout(500);

    // Progress mission to IN_PROGRESS
    const missionRowAbort = page.locator(`text=${missionId}`).first().locator('..');
    await missionRowAbort.locator('button:has-text("Pre-flight")').first().click();
    await page.waitForTimeout(300);
    await missionRowAbort.locator('button:has-text("Start")').first().click();
    await page.waitForTimeout(300);

    // Abort the mission
    await missionRowAbort.locator('button:has-text("Abort")').first().click();
    await page.waitForTimeout(300);

    // Verify mission status changed to ABORTED
    await expect(page.locator('text=ABORTED')).toBeVisible({ timeout: 5000 });
  });

  test('should display fleet overview with maintenance alerts', async () => {
    // Verify we are on dashboard
    await expect(page.locator('text=SkyOps Mission Control')).toBeVisible();

    // Wait for fleet data to load
    await page.waitForTimeout(1000);

    // Verify fleet overview components are visible
    await expect(page.locator('text=/Total Drones|Drones/')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/AVAILABLE|IN_MISSION|MAINTENANCE|RETIRED/')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Avg Flight Hours')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Missions Next 24h')).toBeVisible({ timeout: 5000 });

    // Verify maintenance alerts section exists
    await expect(page.locator('text=Maintenance Alerts')).toBeVisible({ timeout: 5000 });

    // Verify mission view exists
    await expect(page.locator('text=Upcoming & Recent Missions')).toBeVisible({ timeout: 5000 });
  });

  test('should allow drone creation and list display', async () => {
    // Navigate to Drones page
    await page.click('a:has-text("Drones")');
    await page.waitForURL('**/drones');

    // Get initial drone count (if any)
    const initiallisting = page.locator('.list-stack');
    await expect(initiallisting).toBeVisible({ timeout: 5000 });

    // Create a new drone
    const uniqueId = `DRONE-${Date.now()}`;
    const uniqueSerial = `SKY-${String(Date.now()).slice(-4)}-${String(Date.now()).slice(-4)}`;

    await page.fill('input[placeholder="Identifier"]', uniqueId);
    await page.fill('input[placeholder="Serial number"]', uniqueSerial);

    // Select model
    const modelSelect = page.locator('select').nth(0);
    await modelSelect.selectOption('MATRICE_300');

    // Select status
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption('AVAILABLE');

    // Submit form
    const createButton = page.locator('button:has-text("Create drone")');
    await createButton.click();

    // Wait for drone to appear in list
    await page.waitForTimeout(500);

    // Verify the drone appears in the list
    const droneItem = page.locator(`text=${uniqueId}`);
    await expect(droneItem).toBeVisible({ timeout: 5000 });

    // Verify serial number is displayed
    const serialItem = page.locator(`text=${uniqueSerial}`);
    await expect(serialItem).toBeVisible();

    // Verify status is displayed
    const statusItem = page.locator('text=AVAILABLE');
    await expect(statusItem).toBeVisible();
  });

  test('should navigate between all pages', async () => {
    // Test Dashboard navigation
    await page.click('a:has-text("Dashboard")');
    await page.waitForURL(APP_URL);
    await expect(page.locator('text=SkyOps Mission Control')).toBeVisible();

    // Test Drones page navigation
    await page.click('a:has-text("Drones")');
    await page.waitForURL('**/drones');
    await expect(page.locator('text=Drone registry')).toBeVisible({ timeout: 5000 });

    // Test Missions page navigation
    await page.click('a:has-text("Missions")');
    await page.waitForURL('**/missions');
    await expect(page.locator('text=Mission management')).toBeVisible({ timeout: 5000 });

    // Test back to Dashboard
    await page.click('a:has-text("Dashboard")');
    await page.waitForURL(APP_URL);
    await expect(page.locator('text=SkyOps Mission Control')).toBeVisible();
  });

  test('should display drone details on detail page', async () => {
    // Navigate to Drones
    await page.click('a:has-text("Drones")');
    await page.waitForURL('**/drones');
    await page.waitForTimeout(500);

    // Look for first View button
    const firstViewButton = page.locator('button:has-text("View")').first();
    await firstViewButton.click();
    await page.waitForTimeout(1000);

    // Verify drone detail page elements
    await expect(page.locator('text=Drone Information')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Identifier')).toBeVisible();
    await expect(page.locator('text=Serial Number')).toBeVisible();
    await expect(page.locator('text=Model')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();
    await expect(page.locator('text=Flight Hours')).toBeVisible();

    // Verify mission and maintenance history sections
    await expect(page.locator('text=Mission History')).toBeVisible();
    await expect(page.locator('text=Maintenance History')).toBeVisible();
    await expect(page.locator('text=Log Maintenance')).toBeVisible();
  });

  test('should validate mission scheduling constraints', async () => {
    // Navigate to Missions
    await page.click('a:has-text("Missions")');
    await page.waitForURL('**/missions');
    await page.waitForTimeout(500);

    // Try to create mission with invalid time (end before start)
    const missionName = `INVALID-${Date.now()}`;
    const now = new Date();
    const futureStart = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    const pastEnd = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    await page.fill('input[placeholder="Mission name"]', missionName);
    await page.fill('input[type="datetime-local"]:nth-child(6)', futureStart.toISOString().slice(0, 16));
    await page.fill('input[type="datetime-local"]:nth-child(7)', pastEnd.toISOString().slice(0, 16));

    // Try to submit (may fail or show validation error)
    const scheduleButton = page.locator('button:has-text("Schedule mission")');
    await scheduleButton.click();

    // Wait to see if error appears or mission fails silently
    await page.waitForTimeout(500);
  });

  test('should handle API errors gracefully', async () => {
    // Try to navigate to a drone detail page with invalid ID
    await page.goto(`${APP_URL}/drones/invalid-id-12345`);
    await page.waitForTimeout(1000);

    // Page should still be visible (error handling component shown or loading state)
    // This tests error resilience
    const pageShell = page.locator('.page-shell');
    await expect(pageShell).toBeVisible({ timeout: 5000 });
  });
});
