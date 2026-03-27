import { create } from 'zustand';
import {
  type GamePhase,
  type PlayerData,
  type HostInfo,
  type GameState,
  type PlayerListItem,
  type MafiaClientState,
  type MafiaAction,
  type HostSnapshot,
  MafiaClientStateSchema,
  HostSnapshotSchema,
} from './types';
import { createClientP2P, sendActionToHost, destroyPeer, clearRejoinInfo, storeRejoinInfo } from '../p2p/client';
import { useServerStore } from './server-store';
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
  initializeClient: (hostId: string, name: string, skipRejoin?: boolean) => Promise<void>;

  // Action sending
  sendAction: (action: MafiaAction) => void;

  // Host failover
  _attemptFailover: () => void;

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

  initializeClient: async (hostId: string, name: string, skipRejoin = false) => {
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
            get()._attemptFailover();
          },
          onClose: () => {
            get()._attemptFailover();
          },
          onError: (error: Error) => {
            set({ error: error.message, isConnecting: false });
            get().clearStore();
          },
        },
        skipRejoin
      );

      set({ peer });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to connect to host',
        isConnecting: false,
      });
    }
  },

  _attemptFailover: () => {
    const { pendingHostSnapshot, backupHostId, currentPlayerData, peer, gameState } = get();

    // Guard against multiple calls (both onClose and onHostLeft may fire)
    if (get().isConnecting) return;
    set({ isConnecting: true });

    const myId = currentPlayerData?.id;
    const isGameActive = gameState.phase !== 'waiting' && gameState.phase !== 'ended';
    const wasInGame = currentPlayerData?.status === 'inGame' || currentPlayerData?.status === 'eliminated';

    if (!isGameActive || !backupHostId || !wasInGame) {
      // No failover possible or player was never part of the game — clean up
      get().clearStore();
      return;
    }

    // Destroy our old client peer before creating a new one
    if (peer) destroyPeer(peer);
    set({ peer: null, host: null });

    const isBackup = myId === backupHostId;

    if (isBackup && pendingHostSnapshot) {
      // We are the backup host — promote ourselves
      const snapshot = pendingHostSnapshot as HostSnapshot;
      console.log('[Failover] Promoting to host from snapshot');
      // Small delay to let the PeerJS server deregister our old peer ID
      setTimeout(() => {
        useServerStore.getState().initializeHostFromSnapshot(snapshot).then((host) => {
          // Now connect to ourselves as a client
          set({ isConnecting: false });
          get().initializeClient(host.id, currentPlayerData?.name ?? 'Host', true);
        }).catch((err) => {
          console.error('[Failover] Failed to promote to host:', err);
          get().clearStore();
        });
      }, 1000);
    } else {
      // We are a regular client — reconnect to the backup host after a delay
      // to give the backup time to create its host peer
      console.log('[Failover] Reconnecting to backup host:', backupHostId);
      const name = currentPlayerData?.name ?? 'Player';
      if (myId) storeRejoinInfo(myId, backupHostId, name);
      setTimeout(() => {
        set({ isConnecting: false });
        get().initializeClient(backupHostId, name).catch((err) => {
          console.error('[Failover] Failed to reconnect to backup host:', err);
          get().clearStore();
        });
      }, 3000);
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
    // Reset state BEFORE destroying peer to prevent _attemptFailover from
    // seeing stale game state when the close event fires synchronously.
    clearRejoinInfo();
    set(INITIAL_STATE);
    if (peer) {
      destroyPeer(peer);
    }
  },
}));
