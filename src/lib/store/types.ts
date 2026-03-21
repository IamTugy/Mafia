import { z } from 'zod';
import type { DataConnection, Peer } from 'peerjs';

export const RoleSchema = z.enum(['don', 'mafia', 'sheriff', 'civilian', 'unknown']);
export type Role = z.infer<typeof RoleSchema>;

export const GamePhaseSchema = z.enum([
  'waiting',

  // Night stage — Night 1 sequence
  'night.seating',    // players see seat numbers and sit in order
  'night.roleReveal', // card flip
  'night.mafiaSetup', // mafia see each other (Night 1 only)
  'night.mafiaKill',  // Night 2+ kill vote
  'night.sheriffCheck',
  'night.donCheck',

  // Day stage
  'day.start',
  'day.lastWords',
  'day.discussion',
  'day.defense',
  'day.finalVote',

  'ended',
]);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

export type GameStage = 'waiting' | 'night' | 'day' | 'ended';

export const InvestigationResultSchema = z.enum(['village', 'mafia', 'sheriff', 'not-sheriff']);
export type InvestigationResult = z.infer<typeof InvestigationResultSchema>;

export const WinnerSchema = z.enum(['mafia', 'civilians']);
export type Winner = z.infer<typeof WinnerSchema>;

export const GameStateSchema = z.object({
  phase: GamePhaseSchema,
  day: z.number().min(0),
  pausedBy: z.string().optional(),

  // Generic phase start timestamp (used for timeouts/cadence)
  phaseStartedAt: z.number().optional(),

  // Narration routing — this player's device speaks the phase narration
  speakerId: z.string().optional(),

  // Night kill
  lastEliminated: z.string().optional(), // player ID killed last night (announced at day.start)

  // Role reveal / mafia setup / final vote ready gate
  readyPlayers: z.array(z.string()).optional(),

  // Discussion
  // accusations: speakerId -> accused playerID (each speaker ≤ 1 accusation, changeable mid-turn)
  accusations: z.record(z.string()).optional(),
  speakerQueue: z.array(z.number()).optional(), // remaining seat indices
  firstSpeakerSeat: z.number().optional(),
  speakerStartedAt: z.number().optional(),

  // Defense
  defenseIndex: z.number().optional(),

  // Final vote
  voteOpenAt: z.number().optional(),
  voteCount: z.number().optional(),

  // Last words
  lastWordsNextPhase: z.enum(['day.discussion', 'night.mafiaKill']).optional(),

  // Game end
  winner: WinnerSchema.optional(),

  // Narration event + context for TTS
  narrationEvent: z.string().optional(),   // NarrationEventKey value
  narrationContext: z.string().optional(), // e.g. seat number, passed to text template

  // Disconnect voting — all alive players vote to eliminate or wait
  disconnectVotes: z.record(z.enum(['eliminate', 'wait'])).optional(),
});
export type GameState = z.infer<typeof GameStateSchema>;

// Derived helper — the ordered unique list of accused players for defense/finalVote
export const getAccusedList = (state: GameState): string[] =>
  state.accusations ? [...new Set(Object.values(state.accusations))] : [];

export const StatusSchema = z.enum(['waiting', 'inGame', 'eliminated', 'disconnected']);
export type Status = z.infer<typeof StatusSchema>;

export const PlayerListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  index: z.number().nullish(),
  status: StatusSchema.optional(),
  role: RoleSchema.optional(), // only populated when the game has ended
});
export type PlayerListItem = z.infer<typeof PlayerListItemSchema>;

export const PlayerDataSchema = PlayerListItemSchema.extend({
  role: RoleSchema.optional(),
  isReady: z.boolean().optional(),
  characterImage: z.string().optional(),
  // Private investigation data (only sent to the investigating player)
  investigationHistory: z.array(z.string()).optional(),
  lastInvestigationResult: InvestigationResultSchema.optional(),
  // Voting feedback (only sent to the voter)
  myVote: z.string().optional(),
  myKillVote: z.string().optional(),
});
export type PlayerData = z.infer<typeof PlayerDataSchema>;

export const MafiaClientStateSchema = z.object({
  playerData: PlayerDataSchema,
  playersList: z.array(PlayerListItemSchema),
  gameState: GameStateSchema,
  backupHostId: z.string().optional(),
});
export type MafiaClientState = z.infer<typeof MafiaClientStateSchema>;

export const HostSnapshotSchema = z.object({
  players: z.array(PlayerDataSchema),
  gameState: GameStateSchema,
  backupHostId: z.string(),
});
export type HostSnapshot = z.infer<typeof HostSnapshotSchema>;

export const MafiaActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('continue') }),
  z.object({ type: z.literal('kill'), targetId: z.string() }),
  z.object({ type: z.literal('investigate'), targetId: z.string() }),
  z.object({ type: z.literal('accuse'), targetId: z.string() }),
  z.object({ type: z.literal('finishSpeaking') }),
  z.object({ type: z.literal('vote'), targetId: z.string() }),
  // Vote on what to do with a disconnected player
  z.object({ type: z.literal('disconnectVote'), vote: z.enum(['eliminate', 'wait']) }),
]);
export type MafiaAction = z.infer<typeof MafiaActionSchema>;

export interface HostInfo {
  id: string;
  connection: DataConnection;
}

export interface ConnectedClient {
  playerData: PlayerData;
  connection: DataConnection;
}

export interface HostState {
  id: string;
  peer: Peer | null;
  isActive: boolean;
}

export const PlayerStateSchema = MafiaClientStateSchema;
export type PlayerState = MafiaClientState;
