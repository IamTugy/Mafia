import type { NarrationEventKey } from './narration-events';

/**
 * Fallback narration lines per event.
 * Context substitution: {0} is replaced by the first context value (e.g., seat number).
 * Multiple lines per event — one is picked randomly each time.
 */
const LINES: Record<NarrationEventKey, string[]> = {
  // ── Setup ──────────────────────────────────────────────────────────────
  seating: [
    'Welcome to Mafia. Find your seat — the number on your screen is yours for the night.',
    'The game is about to begin. Take your assigned position around the table.',
  ],
  roleReveal: [
    'The city sleeps… but not for long. Press and hold your card to see who you really are.',
    'Secrets are about to be revealed. Check your role — and guard it with your life.',
  ],

  // ── Night ──────────────────────────────────────────────────────────────
  goodNight: [
    'Good night, everyone. Close your eyes. The city drifts into a restless sleep.',
    'Darkness falls over the city. Everyone, close your eyes.',
    'The lights go out. Keep your eyes shut tight.',
  ],
  mafiaWake: [
    'Mafia, open your eyes. Recognize your allies in the shadows.',
    'The Mafia stirs. Open your eyes and find each other in the dark.',
    'Mafia, wake up. Look around — know your allies.',
  ],
  mafiaSleep: [
    'Mafia, close your eyes. Return to the shadows.',
    'Well done. Mafia, go back to sleep.',
    'Mafia, close your eyes now.',
  ],
  mafiaKillBegin: [
    'Mafia, open your eyes. Tonight, someone must fall. Listen for your number.',
    'Mafia, wake up. Choose your target — listen carefully.',
    'The city sleeps unaware. Mafia, open your eyes.',
  ],
  sheriffWake: [
    'Sheriff, wake up. The city needs your eyes.',
    'Sheriff, open your eyes. Who do you suspect tonight?',
    'Sheriff, it is your turn. Open your eyes.',
  ],
  sheriffSleep: [
    'Sheriff, close your eyes. Your work for tonight is done.',
    'Well done, Sheriff. Rest now.',
    'Sheriff, close your eyes.',
  ],
  donWake: [
    'Don, wake up. Is the Sheriff among us?',
    'Don, open your eyes. Use your instincts.',
    'Don, it is your turn. Open your eyes.',
  ],
  donSleep: [
    'Don, close your eyes. The night is over.',
    'Very well. Don, return to your slumber.',
    'Don, close your eyes.',
  ],

  // ── Day ────────────────────────────────────────────────────────────────
  morning: [
    'Everyone, wake up! The sun rises on a troubled city.',
    'Good morning, citizens. Open your eyes — the night has passed.',
    'Rise and shine. What the darkness hid, the light will soon reveal.',
  ],
  deathAnnounced: [
    'Last night was not peaceful. Player number {0} has been found… eliminated.',
    'The city mourns. Seat {0} is empty this morning — they did not survive the night.',
    'A life was taken. Player {0} will not see another sunrise.',
  ],
  noDeath: [
    'Miraculously, no one was harmed last night. The city breathes a cautious sigh of relief.',
    'The night passed without incident. No one was eliminated.',
    'For now, all are safe. But the threat remains.',
  ],
  discussionBegin: [
    'Citizens, the floor is yours. Speak carefully — every word matters.',
    'Discussion begins. Look your neighbours in the eye. Who do you trust?',
    'The truth is out there. Sixty seconds each — use your time wisely.',
  ],
  speakerTurn: [
    "Player {0}, the floor is yours. You have sixty seconds.",
    "Number {0}, it's your turn to speak.",
    "Seat {0} — say what's on your mind.",
  ],
  defenseBegin: [
    'The accused will now have the chance to speak in their defense.',
    'Silence in the court. Each accused player will speak for thirty seconds.',
    'Defense time. The accused will now speak.',
  ],
  defenderTurn: [
    "Player {0}, you may now defend yourself. You have thirty seconds.",
    "Seat {0} — the city is listening. Speak your defense.",
    'Number {0}, convince us of your innocence. Thirty seconds.',
  ],
  voteBegin: [
    "Raise your phones — it's time to cast your votes. The city demands justice.",
    "The moment of truth. Vote wisely; someone's fate rests in your hands.",
  ],
  voteEliminated: [
    'The votes are in. Player {0} has been eliminated by the people.',
    'Justice has been served — or has it? Player {0} is gone.',
    'The city has spoken. Seat {0} is eliminated.',
  ],
  voteTie: [
    'A tie! The city could not decide. All tied players are eliminated.',
    'Deadlock. The votes are split — all tied players face elimination.',
  ],

  // ── End ────────────────────────────────────────────────────────────────
  mafiaWins: [
    'The Mafia has taken control. The city falls into darkness. Mafia wins!',
    'All hope is lost. The Mafia outnumber the civilians. The game is over.',
  ],
  civiliansWin: [
    'Justice prevails! The Mafia has been rooted out. The city is safe. Civilians win!',
    'The citizens triumph! Every Mafia member has been eliminated. Well played.',
  ],

  // ── Disconnect ─────────────────────────────────────────────────────────
  playerDisconnected: [
    'Player {0} has lost their connection. The city waits…',
    'Seat {0} has gone dark. We pause for a moment.',
  ],
  playerReconnected: [
    'Player {0} has returned. The game continues.',
    'Seat {0} is back. Welcome back.',
  ],
  playerEliminatedDisconnect: [
    'The city has voted. Player {0} is eliminated in absentia.',
    'Absent or not — the vote is final. Seat {0} is gone.',
  ],
};

/**
 * Returns a random fallback narration line for an event.
 * Replaces {0} with the optional context string.
 */
export const getFallbackNarration = (
  event: NarrationEventKey,
  context?: string
): string => {
  const lines = LINES[event] ?? [];
  if (lines.length === 0) return '';
  const line = lines[Math.floor(Math.random() * lines.length)];
  return context ? line.replace('{0}', context) : line;
};
