import { create } from 'zustand';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export interface ConnectedPeer {
  id: string;
  name: string;
  connection?: DataConnection;
  isWaiting?: boolean;
}

export interface GameState {
  maxPlayers: number;
  isGameStarted: boolean;
}

interface PeerStore {
  hostId: string;
  currentPeer: Peer | null;
  connectedPeers: ConnectedPeer[];
  waitingPeers: ConnectedPeer[];
  gameState: GameState;
  setHostId: (id: string) => void;
  setCurrentPeer: (peer: Peer | null) => void;
  addPeer: (peer: ConnectedPeer) => void;
  removePeer: (id: string) => void;
  setConnectedPeers: (peers: ConnectedPeer[]) => void;
  setWaitingPeers: (peers: ConnectedPeer[]) => void;
  moveToWaitingList: (peerId: string) => void;
  moveToActiveList: (peerId: string) => void;
  clearStore: () => void;
  isHost: () => boolean;
  updateGameState: (state: Partial<GameState>) => void;
  getActivePlayers: () => ConnectedPeer[];
  getWaitingPlayers: () => ConnectedPeer[];
}

const INITIAL_GAME_STATE: GameState = {
  maxPlayers: 10,
  isGameStarted: false,
};

export const usePeerStore = create<PeerStore>((set, get) => ({
  hostId: "",
  currentPeer: null,
  connectedPeers: [],
  waitingPeers: [],
  gameState: INITIAL_GAME_STATE,
  setHostId: (id: string) => set({ hostId: id }),
  setCurrentPeer: (peer: Peer | null) => set({ currentPeer: peer }),
  addPeer: (peer: ConnectedPeer) => {
    const state = get();
    // If we're at max players, add to waiting list
    if (state.connectedPeers.length >= state.gameState.maxPlayers) {
      set((state) => ({
        waitingPeers: [...state.waitingPeers, { ...peer, isWaiting: true }],
      }));
    } else {
      set((state) => ({
        connectedPeers: [...state.connectedPeers, peer],
      }));
    }
  },
  removePeer: (id: string) => {
    set((state) => ({
      connectedPeers: state.connectedPeers.filter((peer) => peer.id !== id),
      waitingPeers: state.waitingPeers.filter((peer) => peer.id !== id),
    }));
  },
  setConnectedPeers: (peers: ConnectedPeer[]) => set({ connectedPeers: peers }),
  setWaitingPeers: (peers: ConnectedPeer[]) => set({ waitingPeers: peers }),
  moveToWaitingList: (peerId: string) => {
    set((state) => {
      const peer = state.connectedPeers.find(p => p.id === peerId);
      if (!peer) return state;
      
      return {
        connectedPeers: state.connectedPeers.filter(p => p.id !== peerId),
        waitingPeers: [...state.waitingPeers, { ...peer, isWaiting: true }],
      };
    });
  },
  moveToActiveList: (peerId: string) => {
    set((state) => {
      const peer = state.waitingPeers.find(p => p.id === peerId);
      if (!peer) return state;
      
      return {
        waitingPeers: state.waitingPeers.filter(p => p.id !== peerId),
        connectedPeers: [...state.connectedPeers, { ...peer, isWaiting: false }],
      };
    });
  },
  clearStore: () => set({
    hostId: "",
    currentPeer: null,
    connectedPeers: [],
    waitingPeers: [],
    gameState: INITIAL_GAME_STATE,
  }),
  isHost: () => get().currentPeer?.id === get().hostId,
  updateGameState: (newState: Partial<GameState>) => set((state) => ({
    gameState: { ...state.gameState, ...newState }
  })),
  getActivePlayers: () => get().connectedPeers,
  getWaitingPlayers: () => get().waitingPeers,
}));