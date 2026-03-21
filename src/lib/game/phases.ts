import type { GamePhase, PlayerData } from '../store/types';

// Night 1 full sequence (no kill on Night 1)
export const PHASE_SEQUENCE: GamePhase[] = [
  'night.seating',
  'night.roleReveal',
  'night.mafiaSetup',
  'night.sheriffCheck',
  'night.donCheck',
  'day.start',
  'day.discussion',
  'day.defense',
  'day.finalVote',
];

export const getNextPhase = (
  current: GamePhase,
  day: number
): { phase: GamePhase; day: number } => {
  if (current === 'waiting') return { phase: 'night.seating', day: 1 };
  if (current === 'ended') return { phase: 'ended', day };

  // After finalVote: Night 2+ skips seating/roleReveal/mafiaSetup
  if (current === 'day.finalVote') {
    return { phase: 'night.mafiaKill', day: day + 1 };
  }

  // Night 2+: mafiaKill → sheriffCheck (no mafiaSetup)
  if (current === 'night.mafiaKill') {
    return { phase: 'night.sheriffCheck', day };
  }

  const idx = PHASE_SEQUENCE.indexOf(current);
  if (idx === -1 || idx === PHASE_SEQUENCE.length - 1) {
    return { phase: 'night.mafiaKill', day: day + 1 };
  }
  return { phase: PHASE_SEQUENCE[idx + 1], day };
};

export const getAlivePlayers = (players: PlayerData[]): PlayerData[] =>
  players.filter((p) => p.status === 'inGame');

export const getAliveSeats = (players: PlayerData[]): number[] =>
  getAlivePlayers(players)
    .map((p) => p.index)
    .filter((i): i is number => i != null)
    .sort((a, b) => a - b);

/** All seat numbers 1–N in order (including dead, for display grids). */
export const getAllSeats = (players: PlayerData[]): number[] =>
  players
    .map((p) => p.index)
    .filter((i): i is number => i != null)
    .sort((a, b) => a - b);

export const buildSpeakerQueue = (
  firstSpeakerSeat: number,
  alivePlayers: PlayerData[]
): number[] => {
  const seats = getAliveSeats(alivePlayers);
  if (seats.length === 0) return [];
  let startIdx = seats.findIndex((s) => s >= firstSpeakerSeat);
  if (startIdx === -1) startIdx = 0;
  return [...seats.slice(startIdx), ...seats.slice(0, startIdx)];
};

export const getNextFirstSpeaker = (
  currentFirstSeat: number,
  alivePlayers: PlayerData[]
): number => {
  const seats = getAliveSeats(alivePlayers);
  if (seats.length === 0) return 1;
  const idx = seats.indexOf(currentFirstSeat);
  return seats[(idx + 1) % seats.length];
};
