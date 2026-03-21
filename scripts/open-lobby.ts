import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const PLAYER_COUNT = Number(process.argv[2]) || 10;

async function main() {
  const execPath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  const browser = await chromium.launch({
    headless: false,
    ...(execPath ? { executablePath: execPath } : {}),
  });
  const context = await browser.newContext();

  // --- Player 1: create game ---
  const host = await context.newPage();
  await host.goto(BASE_URL);
  await host.fill('[data-testid="player-name-input"]', 'Player 1');
  await host.click('[data-testid="create-game-btn"]');
  await host.waitForSelector('[data-testid="game-code"]', { timeout: 20_000 });
  const gameCode = (await host.textContent('[data-testid="game-code"]'))!.trim();
  console.log(`Game code: ${gameCode}`);

  // --- Players 2-10: join game ---
  for (let i = 2; i <= PLAYER_COUNT; i++) {
    const page = await context.newPage();
    await page.goto(BASE_URL);
    await page.fill('[data-testid="player-name-input"]', `Player ${i}`);
    await fillGameCode(page, gameCode);
    await page.click('[data-testid="join-game-btn"]');
    await page.waitForSelector('[data-testid="game-room"]', { timeout: 20_000 });
    console.log(`Player ${i} joined`);
  }

  console.log('All players in lobby. Close the browser window to exit.');
  // Keep process alive
  await new Promise(() => {});
}

async function fillGameCode(page: import('@playwright/test').Page, code: string) {
  const inputs = await page.locator('[aria-label^="Game code character"]').all();
  for (let i = 0; i < code.length; i++) {
    await inputs[i].fill(code[i]);
  }
}

main().catch(console.error);
