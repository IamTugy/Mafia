import { create } from 'zustand';
import type { GamePhase, PlayerData, HostInfo, GameState, PlayerListItem } from './types';

interface ClientState {
  playersList: PlayerListItem[];
  currentPlayerData: PlayerData | null;
  gameState: GameState;
  host: HostInfo | null;
}

interface ClientStore extends ClientState {
  setPlayersList: (players: PlayerListItem[]) => void;

  setCurrentPlayerData: (data: PlayerData) => void;

  setGameState: (state: GameState) => void;

  setHost: (host: HostInfo) => void;

  // Clear store
  clearStore: () => void;
}

const INITIAL_STATE = {
  playersList: [],
  currentPlayerData: null,
  gameState: {
    phase: 'waiting' as GamePhase,
    day: 0,
  },
  host: null,
};

export const useClientStore = create<ClientStore>((set) => ({
  ...INITIAL_STATE,

  // Players list actions
  setPlayersList: (players: PlayerListItem[]) => set({ playersList: players }),

  // Current player data actions
  setCurrentPlayerData: (data: PlayerData) => set({ currentPlayerData: data }),

  // Game state actions
  setGameState: (state: GameState) => set({ gameState: state }),

  // Host actions
  setHost: (host: HostInfo) => set({ host }),

  // Clear store
  clearStore: () => set(INITIAL_STATE),
}));
