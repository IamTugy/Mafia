/**
 * E2E tests for the Mafia game using Playwright.
 *
 * All pages load with ?e2e&mute so that game timers are shortened
 * (DAY_START 1s, investigation min 0, etc.) and TTS is silenced.
 */

import { test, expect, chromium } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';

// ── Constants ──────────────────────────────────────────────────────────────────

const MIN_PLAYERS = 5;
const CONNECT_TIMEOUT = 30_000;
const PHASE_TIMEOUT = 20_000;
const BASE_URL = '/?e2e&mute';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function fillGameCode(page: Page, code: string) {
  const firstInput = page.locator('[aria-label="Game code character 1"]');
  await firstInput.click();
  await firstInput.fill('');
  await firstInput.evaluate((el, c) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', c);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  }, code);
}

async function createSession(count: number): Promise<{
  browser: import('@playwright/test').Browser;
  context: BrowserContext;
  pages: Page[];
}> {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const pages: Page[] = [];
  for (let i = 0; i < count; i++) {
    pages.push(await context.newPage());
  }
  return { browser, context, pages };
}

async function createGame(hostPage: Page, playerName = 'Player 1'): Promise<string> {
  await hostPage.goto(BASE_URL);
  await hostPage.fill('[data-testid="player-name-input"]', playerName);
  await hostPage.click('[data-testid="create-game-btn"]');
  await hostPage.waitForSelector('[data-testid="game-code"]', { timeout: CONNECT_TIMEOUT });
  return ((await hostPage.textContent('[data-testid="game-code"]')) ?? '').trim();
}

async function joinPlayers(pages: Page[], gameCode: string, startIndex = 1) {
  for (let i = startIndex; i < pages.length; i++) {
    const page = pages[i];
    await page.goto(BASE_URL);
    await page.fill('[data-testid="player-name-input"]', `Player ${i + 1}`);
    await fillGameCode(page, gameCode);
    await page.click('[data-testid="join-game-btn"]');
    await page.waitForSelector('[data-testid="game-room"]', { timeout: CONNECT_TIMEOUT });
  }
}

async function waitForActivePlayers(hostPage: Page, count: number) {
  await hostPage.waitForFunction(
    (n) =>
      document
        .querySelector('[data-testid="active-players-count"]')
        ?.textContent?.includes(`(${n})`),
    count,
    { timeout: CONNECT_TIMEOUT }
  );
}

async function waitForPhase(page: Page, phase: string, timeout = PHASE_TIMEOUT) {
  await expect(page.locator('[data-testid="current-phase"]')).toHaveText(phase, { timeout });
}

async function currentPhase(page: Page): Promise<string> {
  try {
    return (await page.locator('[data-testid="current-phase"]').textContent()) ?? '';
  } catch {
    return '';
  }
}

/**
 * Confirm seating for all players.
 * Transitions: night.seating → night.roleReveal
 */
async function doSeating(pages: Page[]) {
  for (const p of pages) {
    await waitForPhase(p, 'night.seating');
  }
  for (const p of pages) {
    const btn = p.locator('[data-testid="seating-confirm-btn"]');
    await btn.waitFor({ state: 'visible', timeout: PHASE_TIMEOUT });
    await btn.click();
  }
}

/**
 * All players hold the role-reveal card then press Ready.
 * Transitions: night.roleReveal → night.mafiaSetup
 */
async function doRoleReveal(pages: Page[]) {
  for (const p of pages) {
    await waitForPhase(p, 'night.roleReveal');
  }
  for (const p of pages) {
    const card = p.locator('[data-testid="role-reveal-card"]');
    await card.waitFor({ state: 'visible', timeout: PHASE_TIMEOUT });
    await p.evaluate(() => {
      const card = document.querySelector('[data-testid="role-reveal-card"]');
      if (!card) return;
      card.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true })
      );
    });
    await p.waitForTimeout(200);
    const readyBtn = p.locator('[data-testid="role-reveal-ready-btn"]');
    await readyBtn.waitFor({ state: 'visible', timeout: PHASE_TIMEOUT });
    await readyBtn.click();
  }
}

/**
 * Mafia players press Done to complete the mafia-setup phase.
 * Transitions: night.mafiaSetup → night.sheriffCheck
 */
async function doMafiaSetup(pages: Page[]) {
  for (const p of pages) {
    await waitForPhase(p, 'night.mafiaSetup');
  }
  for (const p of pages) {
    const btn = p.locator('[data-testid="mafia-setup-done-btn"]');
    try {
      await btn.waitFor({ state: 'visible', timeout: 2_000 });
      await btn.click();
    } catch {
      // Not mafia — sleeping screen
    }
  }
}

/**
 * Handle the sheriff check phase. Sheriff investigates + presses Continue.
 */
async function doSheriffCheck(pages: Page[]) {
  let sheriffCheckReached = false;
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    for (const p of pages) {
      if ((await currentPhase(p)) === 'night.sheriffCheck') {
        sheriffCheckReached = true;
        break;
      }
    }
    if (sheriffCheckReached) break;
    await pages[0].waitForTimeout(300);
  }
  if (!sheriffCheckReached) return;

  for (const p of pages) {
    if ((await currentPhase(p)) !== 'night.sheriffCheck') continue;
    const continueBtn = p.locator('[data-testid="sheriff-continue-btn"]');
    const sheriffGrid = p.locator('text=Tap a player to investigate');
    if (await sheriffGrid.isVisible().catch(() => false)) {
      const firstTarget = p.locator('[data-testid^="number-grid-btn-"]:not([disabled])').first();
      await firstTarget.waitFor({ state: 'visible', timeout: 3_000 });
      await firstTarget.click();
      await continueBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await continueBtn.click();
      return;
    }
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      return;
    }
  }
}

/**
 * Handle the don check phase. Don investigates + presses Continue.
 */
async function doDonCheck(pages: Page[]) {
  const deadline = Date.now() + 12_000;
  let donCheckReached = false;
  while (Date.now() < deadline) {
    for (const p of pages) {
      if ((await currentPhase(p)) === 'night.donCheck') {
        donCheckReached = true;
        break;
      }
    }
    if (donCheckReached) break;
    for (const p of pages) {
      const phase = await currentPhase(p);
      if (['day.start', 'day.discussion', 'day.lastWords'].includes(phase)) {
        return;
      }
    }
    await pages[0].waitForTimeout(300);
  }
  if (!donCheckReached) return;

  for (const p of pages) {
    if ((await currentPhase(p)) !== 'night.donCheck') continue;
    const continueBtn = p.locator('[data-testid="don-continue-btn"]');
    const donGrid = p.locator('text=Is this player the Sheriff?');
    if (await donGrid.isVisible().catch(() => false)) {
      const firstTarget = p.locator('[data-testid^="number-grid-btn-"]:not([disabled])').first();
      await firstTarget.waitFor({ state: 'visible', timeout: 3_000 });
      await firstTarget.click();
      await continueBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await continueBtn.click();
      return;
    }
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      return;
    }
  }
}

/**
 * All speakers press "Finish" without accusing anyone.
 */
async function doDiscussionNoAccusations(pages: Page[]) {
  await pages[0].waitForFunction(
    () => document.querySelector('[data-testid="current-phase"]')?.textContent === 'day.discussion',
    { timeout: PHASE_TIMEOUT }
  );

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const phase = await currentPhase(pages[0]);
    if (phase !== 'day.discussion') break;

    for (const p of pages) {
      const finishBtn = p.locator('[data-testid="discussion-finish-btn"]');
      if (await finishBtn.isVisible().catch(() => false)) {
        await finishBtn.click();
        await p.waitForTimeout(100);
        break;
      }
    }
    await pages[0].waitForTimeout(200);
  }
}

/**
 * First speaker accuses someone, rest finish normally.
 */
async function doDiscussionWithOneAccusation(pages: Page[]): Promise<void> {
  await pages[0].waitForFunction(
    () => document.querySelector('[data-testid="current-phase"]')?.textContent === 'day.discussion',
    { timeout: PHASE_TIMEOUT }
  );

  let accused = false;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const phase = await currentPhase(pages[0]);
    if (phase !== 'day.discussion') break;

    for (const p of pages) {
      const finishBtn = p.locator('[data-testid="discussion-finish-btn"]');
      const visible = await finishBtn.isVisible().catch(() => false);
      if (!visible) continue;

      if (!accused) {
        const accuseBtn = p.locator('button:has-text("Accuse")');
        if (await accuseBtn.isVisible().catch(() => false)) {
          await accuseBtn.click();
          const firstTarget = p.locator('[data-testid^="number-grid-btn-"]:not([disabled])').first();
          await firstTarget.waitFor({ state: 'visible', timeout: 3_000 });
          await firstTarget.click();
          accused = true;
          // Wait for accusation to register before clicking finish
          await p.waitForTimeout(300);
        }
      }
      // Re-check finish button is still visible after accusation interaction
      if (await finishBtn.isVisible().catch(() => false)) {
        await finishBtn.click();
      }
      await p.waitForTimeout(200);
      break;
    }
    await pages[0].waitForTimeout(300);
  }
}

/**
 * Defender presses Done.
 */
async function doDefense(pages: Page[]) {
  let maxRounds = pages.length + 2;
  while (maxRounds-- > 0) {
    let inDefense = false;
    for (const p of pages) {
      if ((await currentPhase(p)) === 'day.defense') { inDefense = true; break; }
    }
    if (!inDefense) break;

    for (const p of pages) {
      const doneBtn = p.locator('[data-testid="defense-done-btn"]');
      try {
        await doneBtn.waitFor({ state: 'visible', timeout: 800 });
        await doneBtn.click();
        await p.waitForTimeout(200);
        break;
      } catch { /* not defender */ }
    }
    await pages[0].waitForTimeout(300);
  }
}

/**
 * All players press Ready then vote.
 */
async function doFinalVote(pages: Page[]) {
  for (const p of pages) {
    try {
      await waitForPhase(p, 'day.finalVote', 10_000);
    } catch { /* may have already advanced */ }
  }

  for (const p of pages) {
    const readyBtn = p.locator('[data-testid="final-vote-ready-btn"]');
    if (await readyBtn.isVisible().catch(() => false)) {
      await readyBtn.click();
    }
  }

  for (const p of pages) {
    const voteBtn = p.locator('[data-testid^="vote-btn-"]').first();
    try {
      await voteBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await voteBtn.click();
    } catch { /* no vote button or already voted */ }
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Lobby', () => {
  test('host creates game, player joins, start button works', async () => {
    const { browser, context, pages } = await createSession(MIN_PLAYERS);
    try {
      const gameCode = await createGame(pages[0]);
      expect(gameCode).toHaveLength(6);
      expect(gameCode).toMatch(/^[A-Z0-9]{6}$/i);

      // Start button disabled with 1 player
      await expect(pages[0].locator('[data-testid="start-game-btn"]')).toBeDisabled();

      // Join remaining players
      await joinPlayers(pages, gameCode);
      await waitForActivePlayers(pages[0], MIN_PLAYERS);

      // Start button enabled with MIN_PLAYERS
      await expect(pages[0].locator('[data-testid="start-game-btn"]')).toBeEnabled();
      await expect(pages[0].locator('[data-testid="start-game-btn"]')).toContainText('Start Game');
    } finally {
      await context.close();
      await browser.close();
    }
  });
});

test.describe('Night 1 → Day 1', () => {
  test('5 players: full night 1 sequence reaches day.discussion', async () => {
    const { browser, context, pages } = await createSession(MIN_PLAYERS);
    try {
      const gameCode = await createGame(pages[0]);
      await joinPlayers(pages, gameCode);
      await waitForActivePlayers(pages[0], MIN_PLAYERS);
      await pages[0].click('[data-testid="start-game-btn"]');

      // Seating
      for (const p of pages) {
        await waitForPhase(p, 'night.seating');
        await expect(p.locator('[data-testid="phase-seating"]')).toBeVisible();
      }
      await doSeating(pages);

      // Role reveal
      for (const p of pages) {
        await waitForPhase(p, 'night.roleReveal');
        await expect(p.locator('[data-testid="phase-roleReveal"]')).toBeVisible();
      }
      await doRoleReveal(pages);

      // Mafia setup — exactly 2 mafia (don + 1) see the Done button
      for (const p of pages) {
        await waitForPhase(p, 'night.mafiaSetup');
      }
      // Wait for the wake delay (NIGHT_ROLE_WAKE_DELAY_MS = 300ms in e2e mode)
      await pages[0].waitForTimeout(500);
      let mafiaButtonCount = 0;
      for (const p of pages) {
        const btn = p.locator('[data-testid="mafia-setup-done-btn"]');
        if (await btn.isVisible().catch(() => false)) mafiaButtonCount++;
      }
      expect(mafiaButtonCount).toBe(2);
      await doMafiaSetup(pages);

      // Sheriff + don check (auto-handled)
      await doSheriffCheck(pages);
      await doDonCheck(pages);

      // day.start → day.discussion (with e2e mode, day.start = 1s)
      for (const p of pages) {
        await waitForPhase(p, 'day.discussion', 30_000);
      }
      for (const p of pages) {
        await expect(p.locator('[data-testid="phase-discussion"]')).toBeVisible();
      }
    } finally {
      await context.close();
      await browser.close();
    }
  });

  test('discussion speaker has Finish and Accuse buttons', async () => {
    const { browser, context, pages } = await createSession(MIN_PLAYERS);
    try {
      const gameCode = await createGame(pages[0]);
      await joinPlayers(pages, gameCode);
      await waitForActivePlayers(pages[0], MIN_PLAYERS);
      await pages[0].click('[data-testid="start-game-btn"]');
      await doSeating(pages);
      await doRoleReveal(pages);
      await doMafiaSetup(pages);
      await doSheriffCheck(pages);
      await doDonCheck(pages);
      for (const p of pages) {
        await waitForPhase(p, 'day.discussion', 30_000);
      }

      // Find the current speaker — they should see Finish + Accuse
      let speakerFound = false;
      for (const p of pages) {
        const finishBtn = p.locator('[data-testid="discussion-finish-btn"]');
        try {
          await finishBtn.waitFor({ state: 'visible', timeout: 3_000 });
          await expect(p.locator('button:has-text("Accuse")')).toBeVisible();
          speakerFound = true;
          break;
        } catch { /* not speaker */ }
      }
      expect(speakerFound).toBe(true);
    } finally {
      await context.close();
      await browser.close();
    }
  });

  test('no accusations → advances to night 2', async () => {
    const { browser, context, pages } = await createSession(MIN_PLAYERS);
    try {
      const gameCode = await createGame(pages[0]);
      await joinPlayers(pages, gameCode);
      await waitForActivePlayers(pages[0], MIN_PLAYERS);
      await pages[0].click('[data-testid="start-game-btn"]');
      await doSeating(pages);
      await doRoleReveal(pages);
      await doMafiaSetup(pages);
      await doSheriffCheck(pages);
      await doDonCheck(pages);
      for (const p of pages) {
        await waitForPhase(p, 'day.discussion', 30_000);
      }

      await doDiscussionNoAccusations(pages);

      // Should reach night 2
      const reachedNight2 = await pages[0].waitForFunction(
        () => {
          const el = document.querySelector('[data-testid="current-phase"]');
          const phase = el?.textContent ?? '';
          return [
            'night.mafiaKill', 'night.sheriffCheck', 'night.donCheck',
            'day.start', 'day.lastWords', 'ended',
          ].includes(phase);
        },
        { timeout: 30_000 }
      ).then(() => true).catch(() => false);
      expect(reachedNight2).toBe(true);
    } finally {
      await context.close();
      await browser.close();
    }
  });
});

