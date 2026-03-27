// E2E mode: detected via ?e2e query param — shrinks all timers so tests run fast
const _e2e = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e');

// Player limits
export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 5;
export const MIN_PLAYERS_FOR_SHERIFF = 6;

// Role distribution
export const MAFIA_RATIO = 0.2; // fraction of players assigned mafia (min 1)

// Phase timing (seconds)
export const DISCUSSION_TIME_SECONDS = _e2e ? 20 : 60;
export const DEFENSE_TIME_SECONDS = _e2e ? 5 : 30;
export const FINAL_VOTE_COUNTDOWN_SECONDS = _e2e ? 1 : 5;
export const FINAL_VOTE_TIME_SECONDS = _e2e ? 2 : 5;
export const LAST_WORDS_SECONDS = _e2e ? 3 : 30;

// Narration buffer
export const SPEAKER_NARRATION_BUFFER_MS = 0; // delay before discussion/defense timer starts

// Phase auto-advance timeouts (milliseconds)
export const DAY_START_DURATION_MS = _e2e ? 1000 : 10000;
export const NIGHT_TRANSITION_DELAY_MS = _e2e ? 200 : 2000;
export const NIGHT_ROLE_WAKE_DELAY_MS = _e2e ? 300 : 5000; // sleep screen before role-specific UI appears
export const MAFIA_SETUP_TIMEOUT_MS = _e2e ? 5000 : 30000;
export const NIGHT_INVESTIGATION_TIMEOUT_MS = _e2e ? 5000 : 30000;
export const NIGHT_INVESTIGATION_MIN_MS = _e2e ? 0 : 10000;
export const NIGHT_INVESTIGATION_MAX_MS = _e2e ? 0 : 30000;

// Mafia kill number-calling cadence
export const MAFIA_NUMBER_CALL_INTERVAL_MS = _e2e ? 200 : 2000;
export const MAFIA_KILL_WAIT_AFTER_CALLS_MS = _e2e ? 500 : 5000;
export const MAFIA_KILL_SLEEP_DELAY_MS = _e2e ? 500 : 14000;

// Role reveal card
export const ROLE_REVEAL_HOLD_MS = 0; // how long pointer must be held before card flips (0 = instant, good for e2e tests)

// P2P
export const CONNECTION_TIMEOUT_MS = 10000;
