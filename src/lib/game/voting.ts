import type { PlayerData } from '../store/types';
import { isMafiaRole, isCivilianRole } from './roles';

export interface VoteTally {
  winnerId: string | null;
  isTie: boolean;
  tiedIds: string[];
}

/** Tallies votes and returns the majority winner, or a tie set. */
export const tallyVotes = (votes: Record<string, string>): VoteTally => {
  const counts: Record<string, number> = {};
  for (const targetId of Object.values(votes)) {
    counts[targetId] = (counts[targetId] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return { winnerId: null, isTie: false, tiedIds: [] };

  const maxCount = Math.max(...entries.map(([, c]) => c));
  const topEntries = entries.filter(([, c]) => c === maxCount).map(([id]) => id);

  if (topEntries.length === 1) return { winnerId: topEntries[0], isTie: false, tiedIds: [] };
  return { winnerId: null, isTie: true, tiedIds: topEntries };
};

/**
 * Mafia kill is unanimous: all voters must agree on the same target.
 * Returns the targetId on unanimous agreement, otherwise null (split = no kill).
 */
export const tallyKillVotes = (votes: Record<string, string>): string | null => {
  const targets = Object.values(votes);
  if (targets.length === 0) return null;
  const first = targets[0];
  return targets.every((t) => t === first) ? first : null;
};

export type WinResult = 'mafia' | 'civilians' | null;

/**
 * Returns the winning faction, or null if the game is still ongoing.
 * Checked after every elimination.
 */
export const checkWinCondition = (players: PlayerData[]): WinResult => {
  const alive = players.filter((p) => p.status === 'inGame');
  const aliveMafia = alive.filter((p) => isMafiaRole(p.role));
  const aliveCivilians = alive.filter((p) => isCivilianRole(p.role));

  if (aliveMafia.length === 0) return 'civilians';
  if (aliveMafia.length >= aliveCivilians.length) return 'mafia';
  return null;
};
