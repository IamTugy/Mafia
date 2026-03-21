import { chromium } from '@playwright/test';

const SIMULATOR_URL = 'http://localhost:5174';
const PLAYER_COUNT = Math.min(10, Math.max(5, Number(process.argv[2]) || 10));

async function main() {
  const execPath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  const browser = await chromium.launch({
    headless: false,
    ...(execPath ? { executablePath: execPath } : {}),
  });
  const context = await browser.newContext();

  // Open simulator — phone 0 creates the game as Player 1 (hostFirst mode).
  // Once the game code is available, the simulator auto-connects all other phones.
  const simulatorPage = await context.newPage();
  await simulatorPage.goto(
    `${SIMULATOR_URL}?count=${PLAYER_COUNT}&hostFirst=true`
  );

  console.log(`Simulator open at ${SIMULATOR_URL} — Player 1 creating game, others will connect automatically`);
  console.log('Close the browser window to exit.');

  await new Promise(() => {});
}

main().catch(console.error);
