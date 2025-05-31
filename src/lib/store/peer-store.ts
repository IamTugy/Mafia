import { create } from 'zustand';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export interface ConnectedPeer {
  id: string;
  name: string;
  connection?: DataConnection;
}

export interface GameState {
  maxPlayers: number;
  isGameStarted: boolean;
}

interface PeerStore {
  hostId: string;
  currentPeer: Peer | null;
  connectedPeers: ConnectedPeer[];
  gameState: GameState;
  setHostId: (id: string) => void;
  setCurrentPeer: (peer: Peer | null) => void;
  addPeer: (peer: ConnectedPeer) => void;
  removePeer: (id: string) => void;
  setConnectedPeers: (peers: ConnectedPeer[]) => void;
  clearStore: () => void;
  isHost: () => boolean;
  updateGameState: (state: Partial<GameState>) => void;
}

const INITIAL_GAME_STATE: GameState = {
  maxPlayers: 10,
  isGameStarted: false,
};

export const usePeerStore = create<PeerStore>((set, get) => ({
  hostId: "",
  currentPeer: null,
  connectedPeers: [],
  gameState: INITIAL_GAME_STATE,
  setHostId: (id: string) => set({ hostId: id }),
  setCurrentPeer: (peer: Peer | null) => set({ currentPeer: peer }),
  addPeer: (peer: ConnectedPeer) => set((state) => ({
    connectedPeers: [...state.connectedPeers, peer],
  })),
  removePeer: (id: string) => set((state) => ({
    connectedPeers: state.connectedPeers.filter((peer) => peer.id !== id),
  })),
  setConnectedPeers: (peers: ConnectedPeer[]) => set({ connectedPeers: peers }),
  clearStore: () => set({
    hostId: "",
    currentPeer: null,
    connectedPeers: [],
    gameState: INITIAL_GAME_STATE,
  }),
  isHost: () => get().currentPeer?.id === get().hostId,
  updateGameState: (newState: Partial<GameState>) => set((state) => ({
    gameState: { ...state.gameState, ...newState }
  })),
}));