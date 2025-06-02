import { z } from 'zod';
import type { DataConnection } from 'peerjs';

// Zod schemas
export const RoleSchema = z.enum(['don', 'mafia', 'sheriff', 'civilian', 'unknown']);
export type Role = z.infer<typeof RoleSchema>;

export const GamePhaseSchema = z.enum([
  // Waiting stage
  'waiting',          // Waiting for players to join
  
  // Night stage
  'night.roleReveal',  // First night - players discover their roles
  'night.mafiaSetup',  // First night - mafia meet and don chooses targets
  'night.mafiaKill',   // Night - mafia choose who to kill
  'night.sheriffCheck',// Night - sheriff investigates
  'night.donCheck',    // Night - don investigates
  
  // Day stage
  'day.start',         // Day - announce night results
  'day.discussion',    // Day - players discuss and can accuse others during their turn
  'day.defense',       // Day - accused players defend
  'day.finalVote',     // Day - final vote
  
  // End stage
  'ended'             // Game ended
]);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

// Helper type to get the stage from a phase
export type GameStage = 'waiting' | 'night' | 'day' | 'ended';

export const GameStateSchema = z.object({
  phase: GamePhaseSchema,
  day: z.number().min(0),
});
export type GameState = z.infer<typeof GameStateSchema>;

export const PlayerListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  index: z.number().optional(),
  status: z.enum(['waiting', 'inGame']).optional(),
});
export type PlayerListItem = z.infer<typeof PlayerListItemSchema>;

export const PlayerDataSchema = PlayerListItemSchema.extend({
  role: RoleSchema.optional(),
  isReady: z.boolean().optional(),
  characterImage: z.string().optional(),
});
export type PlayerData = z.infer<typeof PlayerDataSchema>;

// Peer message schemas
export const PeerMessageTypeSchema = z.enum([
  'join', 'leave', 'peerList', 'message', 'hostLeft', 'gameState', 'waitingList', 'playerData'
]);

export const PeerMessageSchema = z.object({
  type: PeerMessageTypeSchema,
  id: z.string().optional(),
  name: z.string().optional(),
  content: z.string().optional(),
  peers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(['waiting', 'inGame'])
  })).optional(),
  gameState: GameStateSchema.optional(),
  playerName: z.string().optional(),
  playerData: PlayerDataSchema.optional(),
  playersList: z.array(PlayerListItemSchema).optional(),
});
export type PeerMessage = z.infer<typeof PeerMessageSchema>;

export const MessageContentSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  content: z.string().optional(),
  peers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(['waiting', 'inGame'])
  })).optional(),
  gameState: GameStateSchema.optional(),
  playerName: z.string().optional(),
  playerData: PlayerDataSchema.optional(),
  playersList: z.array(PlayerListItemSchema).optional(),
});
export type MessageContent = z.infer<typeof MessageContentSchema>;

// Non-serializable types (contain functions/objects)
export interface HostInfo {
  id: string;
  connection: DataConnection;
}

// Serialization helpers
export const serializeMessage = (message: unknown): string => {
  const result = PeerMessageSchema.safeParse(message);
  if (!result.success) {
    console.error('Message serialization failed:', result.error);
    throw new Error('Invalid message format');
  }
  return JSON.stringify(result.data);
};

export const deserializeMessage = (data: string): PeerMessage | null => {
  try {
    const parsed = JSON.parse(data);
    const result = PeerMessageSchema.safeParse(parsed);
    if (!result.success) {
      console.error('Message deserialization failed:', result.error);
      return null;
    }
    return result.data;
  } catch (error) {
    console.error('JSON parsing failed:', error);
    return null;
  }
};

export const validateGameState = (data: unknown): GameState | null => {
  const result = GameStateSchema.safeParse(data);
  if (!result.success) {
    console.error('Game state validation failed:', result.error);
    return null;
  }
  return result.data;
};

export const validatePlayerData = (data: unknown): PlayerData | null => {
  const result = PlayerDataSchema.safeParse(data);
  if (!result.success) {
    console.error('Player data validation failed:', result.error);
    return null;
  }
  return result.data;
};

export const validatePlayersList = (data: unknown): PlayerListItem[] | null => {
  const result = z.array(PlayerListItemSchema).safeParse(data);
  if (!result.success) {
    console.error('Players list validation failed:', result.error);
    return null;
  }
  return result.data;
};

