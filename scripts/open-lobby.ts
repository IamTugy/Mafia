import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const PLAYER_COUNT = Number(process.argv[2]) || 10;
const AUTO_START = process.argv.includes('--start');

async function main() {
  const execPath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  const browser = await chromium.launch({
    headless: false,
    ...(execPath ? { executablePath: execPath } : {}),
  });
  const context = await browser.newContext();
  const pages: Page[] = [];

  // --- Player 1: create game ---
  const host = await context.newPage();
  pages.push(host);
  await host.goto(BASE_URL);
  await host.fill('[data-testid="player-name-input"]', 'Player 1');
  await host.click('[data-testid="create-game-btn"]');
  await host.waitForSelector('[data-testid="game-code"]', { timeout: 20_000 });
  const gameCode = (await host.textContent('[data-testid="game-code"]'))!.trim();
  console.log(`Game code: ${gameCode}`);

  // --- Players 2-N: join game ---
  for (let i = 2; i <= PLAYER_COUNT; i++) {
    const page = await context.newPage();
    pages.push(page);
    await page.goto(BASE_URL);
    await page.fill('[data-testid="player-name-input"]', `Player ${i}`);
    await fillGameCode(page, gameCode);
    await page.click('[data-testid="join-game-btn"]');
    await page.waitForSelector('[data-testid="game-room"]', { timeout: 20_000 });
    console.log(`Player ${i} joined`);
  }

  if (AUTO_START) {
    console.log('Auto-starting game...');

    // Click Start Game
    await host.click('[data-testid="start-game-btn"]');

    // All players confirm seating
    for (const p of pages) {
      const btn = p.locator('[data-testid="seating-confirm-btn"]');
      await btn.waitFor({ state: 'visible', timeout: 20_000 });
      await btn.click();
    }
    console.log('Seating confirmed');

    // All players flip card + press Ready
    for (const p of pages) {
      const card = p.locator('[data-testid="role-reveal-card"]');
      await card.waitFor({ state: 'visible', timeout: 20_000 });
      await p.evaluate(() => {
        const el = document.querySelector('[data-testid="role-reveal-card"]');
        el?.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true })
        );
      });
      await p.waitForTimeout(200);
      const readyBtn = p.locator('[data-testid="role-reveal-ready-btn"]');
      await readyBtn.waitFor({ state: 'visible', timeout: 20_000 });
      await readyBtn.click();
    }
    console.log('Role reveal done — game is in night 1');
  } else {
    console.log('All players in lobby. Close the browser window to exit.');
  }

  // Keep process alive
  await new Promise(() => {});
}

async function fillGameCode(page: Page, code: string) {
  const inputs = await page.locator('[aria-label^="Game code character"]').all();
  for (let i = 0; i < code.length; i++) {
    await inputs[i].fill(code[i]);
  }
}

main().catch(console.error);
