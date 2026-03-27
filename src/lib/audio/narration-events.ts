/**
 * All narration events in the game.
 * Values are the lookup keys used in the fallback lines table.
 * Adding a new event here + lines in narration.ts is all that's needed
 * to make a moment verbally guided — or swap in custom text later.
 */
export const NarrationEvent = {
  // ── Setup ──────────────────────────────────────────────────────────────
  SEATING: 'seating',
  ROLE_REVEAL: 'roleReveal',

  // ── Night ──────────────────────────────────────────────────────────────
  GOOD_NIGHT: 'goodNight',         // everyone close eyes (roleReveal → mafiaSetup)
  MAFIA_WAKE: 'mafiaWake',         // mafia open eyes
  MAFIA_SLEEP: 'mafiaSleep',       // mafia close eyes (before sheriff)
  MAFIA_KILL_BEGIN: 'mafiaKillBegin', // Night 2+ kill phase starts
  SHERIFF_WAKE: 'sheriffWake',
  SHERIFF_SLEEP: 'sheriffSleep',
  DON_WAKE: 'donWake',
  DON_SLEEP: 'donSleep',

  // ── Day ────────────────────────────────────────────────────────────────
  MORNING: 'morning',
  DEATH_ANNOUNCED: 'deathAnnounced',      // context: seat number
  NO_DEATH: 'noDeath',
  DISCUSSION_BEGIN: 'discussionBegin',
  SPEAKER_TURN: 'speakerTurn',            // context: seat number
  DEFENSE_BEGIN: 'defenseBegin',
  DEFENDER_TURN: 'defenderTurn',          // context: seat number
  VOTE_BEGIN: 'voteBegin',
  VOTE_ELIMINATED: 'voteEliminated',      // context: seat number
  VOTE_TIE: 'voteTie',                    // context: seat numbers
  LAST_WORDS: 'lastWords',

  // ── End ────────────────────────────────────────────────────────────────
  MAFIA_WINS: 'mafiaWins',
  CIVILIANS_WIN: 'civiliansWin',

  // ── Disconnect ─────────────────────────────────────────────────────────
  PLAYER_DISCONNECTED: 'playerDisconnected', // context: seat number
  PLAYER_RECONNECTED: 'playerReconnected',   // context: seat number
  PLAYER_ELIMINATED_DISCONNECT: 'playerEliminatedDisconnect', // context: seat number
} as const;

export type NarrationEventKey = (typeof NarrationEvent)[keyof typeof NarrationEvent];
