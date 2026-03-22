// Player limits
export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 5;
export const MIN_PLAYERS_FOR_SHERIFF = 6;

// Role distribution
export const MAFIA_RATIO = 0.2; // fraction of players assigned mafia (min 1)

// Phase timing (seconds)
export const DISCUSSION_TIME_SECONDS = 60;
export const DEFENSE_TIME_SECONDS = 30;
export const FINAL_VOTE_COUNTDOWN_SECONDS = 5; // countdown after all ready before voting opens
export const FINAL_VOTE_TIME_SECONDS = 5;       // voting window; auto-casts missing votes when expired
export const LAST_WORDS_SECONDS = 30;           // eliminated player's last words duration

// Narration buffer
export const SPEAKER_NARRATION_BUFFER_MS = 0; // delay before discussion/defense timer starts

// Phase auto-advance timeouts (milliseconds)
export const DAY_START_DURATION_MS = 30000;          // how long day.start is shown (death announcement + reaction time)
export const NIGHT_TRANSITION_DELAY_MS = 2000;       // pause between night sub-phases (fake delay)
export const MAFIA_SETUP_TIMEOUT_MS = 60000;         // fallback if not all mafia press Done (Night 1 turn)
export const NIGHT_INVESTIGATION_TIMEOUT_MS = 60000; // fallback if sheriff/don doesn't press Continue
export const NIGHT_INVESTIGATION_MIN_MS = 40000;    // minimum duration for sheriff/don turn (random min–max)
export const NIGHT_INVESTIGATION_MAX_MS = 60000;    // maximum duration for sheriff/don turn (also the hard cap)

// Mafia kill number-calling cadence
export const MAFIA_NUMBER_CALL_INTERVAL_MS = 2000;   // gap between each seat number call
export const MAFIA_KILL_WAIT_AFTER_CALLS_MS = 5000;  // extra wait after last number before tally
export const MAFIA_KILL_SLEEP_DELAY_MS = 14000;      // pause before first number (lets narration finish / everyone "sleeps")

// Role reveal card
export const ROLE_REVEAL_HOLD_MS = 0; // how long pointer must be held before card flips (0 = instant, good for e2e tests)

// P2P
export const CONNECTION_TIMEOUT_MS = 10000;
