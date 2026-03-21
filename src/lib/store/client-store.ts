import { create } from 'zustand';
import {
  type GamePhase,
  type PlayerData,
  type HostInfo,
  type GameState,
  type PlayerListItem,
  type MafiaClientState,
  type MafiaAction,
  MafiaClientStateSchema,
  HostSnapshotSchema,
} from './types';
import { createClientP2P, sendActionToHost, destroyPeer, clearRejoinInfo } from '../p2p/client';
import type { Peer } from 'peerjs';

interface ClientState {
  playersList: PlayerListItem[];
  currentPlayerData: PlayerData | null;
  gameState: GameState;
  host: HostInfo | null;
  peer: Peer | null;
  isConnecting: boolean;
  error: string | null;
  backupHostId: string | null;
  pendingHostSnapshot: unknown | null;
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

  // Action sending
  sendAction: (action: MafiaAction) => void;

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
  backupHostId: null,
  pendingHostSnapshot: null,
};

export const useClientStore = create<ClientStore>((set, get) => ({
  ...INITIAL_STATE,

  getPlayersList: () => get().playersList,
  getCurrentPlayerData: () => get().currentPlayerData,
  getGameState: () => get().gameState,
  getHost: () => get().host,

  setPlayersList: (players: PlayerListItem[]) => set({ playersList: players }),
  setCurrentPlayerData: (data: PlayerData) => set({ currentPlayerData: data }),
  setGameState: (state: GameState) => set({ gameState: state }),
  setHost: (host: HostInfo) => set({ host }),
  setPeer: (peer: Peer | null) => set({ peer }),
  setConnecting: (isConnecting: boolean) => set({ isConnecting }),
  setError: (error: string | null) => set({ error }),

  initializeClient: async (hostId: string, name: string) => {
    set({ isConnecting: true, error: null });

    try {
      const { peer, connection } = await createClientP2P<MafiaClientState>(
        hostId,
        name,
        {
          onConnected: () => {
            set({ host: { id: hostId, connection }, isConnecting: false, error: null });
          },
          onStateUpdate: (state: MafiaClientState) => {
            const result = MafiaClientStateSchema.safeParse(state);
            if (!result.success) {
              console.error('Failed to validate state from host:', result.error);
              return;
            }
            const { playerData, playersList, gameState, backupHostId } = result.data;
            set({
              currentPlayerData: playerData,
              playersList,
              gameState,
              backupHostId: backupHostId ?? null,
            });
          },
          onBecomeHost: (snapshot: unknown) => {
            // Store snapshot — the UI/store orchestrator will handle the transition
            const result = HostSnapshotSchema.safeParse(snapshot);
            if (result.success) {
              set({ pendingHostSnapshot: result.data });
            } else {
              console.error('Failed to validate host snapshot:', result.error);
            }
          },
          onHostLeft: () => {
            get().clearStore();
          },
          onClose: () => {
            set({ error: 'Connection to host was closed', isConnecting: false });
            get().clearStore();
          },
          onError: (error: Error) => {
            set({ error: error.message, isConnecting: false });
            get().clearStore();
          },
        }
      );

      set({ peer });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to connect to host',
        isConnecting: false,
      });
    }
  },

  sendAction: (action: MafiaAction) => {
    const { host } = get();
    if (!host?.connection?.open) {
      console.error('No active connection to host');
      return;
    }
    sendActionToHost(host.connection, action);
  },

  clearStore: () => {
    const { peer } = get();
    if (peer) {
      destroyPeer(peer);
    }
    clearRejoinInfo();
    set(INITIAL_STATE);
  },
}));
