import { create } from 'zustand';
import type { DataConnection } from 'peerjs';

interface Peer {
  id: string;
  name: string;
  connection: DataConnection;
}

interface PeerStore {
  isHost: boolean;
  connectedPeers: Map<string, Peer>;
  setHost: (isHost: boolean) => void;
  addPeer: (peer: Peer) => void;
  removePeer: (peerId: string) => void;
  getPeerList: () => Peer[];
}

export const usePeerStore = create<PeerStore>((set, get) => ({
  isHost: false,
  connectedPeers: new Map(),
  
  setHost: (isHost: boolean) => {
    console.log('Setting host status:', isHost);
    set({ isHost });
  },
  
  addPeer: (peer: Peer) => {
    console.log('Adding peer to store:', peer.id, peer.name);
    set((state) => {
      const newPeers = new Map(state.connectedPeers);
      newPeers.set(peer.id, peer);
      console.log('Store updated, total peers:', newPeers.size);
      return { connectedPeers: newPeers };
    });
  },
  
  removePeer: (peerId: string) => {
    console.log('Removing peer from store:', peerId);
    set((state) => {
      const newPeers = new Map(state.connectedPeers);
      const removed = newPeers.delete(peerId);
      console.log('Peer removed:', removed, 'Total peers:', newPeers.size);
      return { connectedPeers: newPeers };
    });
  },
  
  getPeerList: () => {
    const peers = Array.from(get().connectedPeers.values());
    console.log('Getting peer list:', peers.length, 'peers');
    return peers;
  }
})); 