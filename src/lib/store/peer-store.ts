import { create } from 'zustand';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

interface ConnectedPeer {
  id: string;
  name: string;
  connection: DataConnection;
}

interface PeerStore {
  hostId: string;
  currentPeer: Peer | null;
  connectedPeers: ConnectedPeer[];
  setHostId: (id: string) => void;
  setCurrentPeer: (peer: Peer | null) => void;
  addPeer: (peer: ConnectedPeer) => void;
  removePeer: (id: string) => void;
  getPeerList: () => ConnectedPeer[];
  clearStore: () => void;
  isHost: () => boolean;
}

export const usePeerStore = create<PeerStore>((set, get) => ({
  hostId: "",
  currentPeer: null,
  connectedPeers: [],
  setHostId: (id: string) => set({ hostId: id }),
  setCurrentPeer: (peer: Peer | null) => set({ currentPeer: peer }),
  addPeer: (peer: ConnectedPeer) => set((state) => ({
    connectedPeers: [...state.connectedPeers, peer],
  })),
  removePeer: (id: string) => set((state) => ({
    connectedPeers: state.connectedPeers.filter((peer) => peer.id !== id),
  })),
  getPeerList: () => get().connectedPeers,
  clearStore: () => set({
    hostId: "",
    currentPeer: null,
    connectedPeers: [],
  }),
  isHost: () => get().currentPeer?.id === get().hostId,
}));