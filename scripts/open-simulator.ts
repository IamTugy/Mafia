import { chromium } from '@playwright/test';

const MAFIA_URL = 'http://localhost:5173';
const SIMULATOR_URL = 'http://localhost:5174';
const PLAYER_COUNT = Math.min(10, Math.max(5, Number(process.argv[2]) || 10));

async function main() {
  const execPath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  const browser = await chromium.launch({
    headless: false,
    ...(execPath ? { executablePath: execPath } : {}),
  });
  const context = await browser.newContext();

  // Player 1: create game via URL params
  const hostPage = await context.newPage();
  await hostPage.goto(
    `${MAFIA_URL}?host=true&playerName=${encodeURIComponent('Player 1')}`
  );
  await hostPage.waitForSelector('[data-testid="game-code"]', { timeout: 20_000 });
  const gameCode = (await hostPage.textContent('[data-testid="game-code"]'))!.trim();
  console.log(`Game code: ${gameCode}`);

  // Open simulator — phones 2..N will auto-join via URL params inside iframes
  const simulatorPage = await context.newPage();
  await simulatorPage.goto(
    `${SIMULATOR_URL}?gameCode=${gameCode}&count=${PLAYER_COUNT}`
  );

  console.log(`Simulator open at ${SIMULATOR_URL} — ${PLAYER_COUNT} players connecting in background`);
  console.log('Close the browser window to exit.');

  await new Promise(() => {});
}

main().catch(console.error);
