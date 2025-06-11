import { create } from 'zustand';
import {
  type GamePhase,
  type PlayerData,
  type HostInfo,
  type GameState,
  type PlayerListItem,
  MessageTypeSchema,
} from './types';
import { createClientPeer } from '../utils/client-utils';
import { parseMessage } from '../utils/peer-utils';
import type { Peer } from 'peerjs';

interface ClientState {
  playersList: PlayerListItem[];
  currentPlayerData: PlayerData | null;
  gameState: GameState;
  host: HostInfo | null;
  peer: Peer | null;
  isConnecting: boolean;
  error: string | null;
}

interface ClientStore extends ClientState {
  // Getters
  getPlayersList: () => PlayerListItem[];
  getCurrentPlayerData: () => PlayerData | null;
  getGameState: () => GameState;
  getHost: () => HostInfo | null;

  // Setters
  setPlayersList: (players: PlayerListItem[]) => void;
  setCurrentPlayerData: (data: PlayerData) => void;
  setGameState: (state: GameState) => void;
  setHost: (host: HostInfo) => void;
  setPeer: (peer: Peer | null) => void;
  setConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;

  // Client initialization
  initializeClient: (hostId: string, name: string) => Promise<void>;

  // Clear store
  clearStore: () => void;
}

const INITIAL_STATE: ClientState = {
  playersList: [],
  currentPlayerData: null,
  gameState: {
    phase: 'waiting' as GamePhase,
    day: 0,
  },
  host: null,
  peer: null,
  isConnecting: false,
  error: null,
};

export const useClientStore = create<ClientStore>((set, get) => ({
  ...INITIAL_STATE,

  // Getters
  getPlayersList: () => get().playersList,
  getCurrentPlayerData: () => get().currentPlayerData,
  getGameState: () => get().gameState,
  getHost: () => get().host,

  // Setters
  setPlayersList: (players: PlayerListItem[]) => set({ playersList: players }),
  setCurrentPlayerData: (data: PlayerData) => set({ currentPlayerData: data }),
  setGameState: (state: GameState) => set({ gameState: state }),
  setHost: (host: HostInfo) => set({ host }),
  setPeer: (peer: Peer | null) => set({ peer }),
  setConnecting: (isConnecting: boolean) => set({ isConnecting }),
  setError: (error: string | null) => set({ error }),

  // Client initialization
  initializeClient: async (hostId: string, name: string) => {
    set({ isConnecting: true, error: null });

    try {
      const { peer, connection } = await createClientPeer(
        hostId,
        name,
        () => {
          set({
            host: { id: hostId, connection },
            isConnecting: false,
            error: null,
          });
        },
        (data) => {
          // Handle incoming messages
          const message = parseMessage(data);
          console.log('message', message);
          if (!message) {
            console.error('Failed to parse message from host');
            return;
          }

          switch (message.type) {
            case MessageTypeSchema.enum.playerState: {
              if (!message.playerState) break;
              get().setCurrentPlayerData(message.playerState.playerData);
              get().setPlayersList(message.playerState.playersList);
              get().setGameState(message.playerState.gameState);
              break;
            }

            case MessageTypeSchema.enum.hostLeft:
              get().clearStore();
              break;

            default:
              console.error('Unknown message type:', message.type);
              break;
          }
        },
        () => {
          set({ error: 'Connection to host was closed', isConnecting: false });
          get().clearStore();
        },
        (error) => {
          set({ error: error.message, isConnecting: false });
          get().clearStore();
        }
      );

      set({ peer });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to connect to host',
        isConnecting: false,
      });
      get().clearStore();
    }
  },

  // Clear store
  clearStore: () => {
    const { peer } = get();
    if (peer) {
      peer.destroy();
    }
    set(INITIAL_STATE);
  },
}));
