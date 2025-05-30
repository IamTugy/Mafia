import { useState } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { usePeerStore } from '@/lib/store/peer-store';

interface PeerMessage {
  type: 'join' | 'leave' | 'peerList' | 'message' | 'hostLeft';
  id?: string;
  name?: string;
  content?: string;
  peers?: Array<{ id: string; name: string }>;
}

interface UsePeerReturn {
  currentPeer: Peer | null;
  hostId: string;
  isInGame: boolean;
  isCreating: boolean;
  isJoining: boolean;
  createGame: (playerName: string) => Promise<void>;
  joinGame: (gameId: string, playerName: string) => Promise<void>;
  leaveGame: () => void;
}

const generateShortId = (): string => {
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
};

export function usePeer(): UsePeerReturn {
  const [isInGame, setIsInGame] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { 
    hostId, 
    currentPeer, 
    setHostId, 
    setCurrentPeer, 
    addPeer, 
    removePeer, 
    getPeerList, 
    connectedPeers,
    clearStore 
  } = usePeerStore();

  const createPeer = (): Promise<{ peer: Peer; id: string }> => {
    return new Promise((resolve, reject) => {
      const id = generateShortId();
      console.log('Generated peer ID:', id);
      
      const peer = new Peer(id, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        debug: 3,
      });

      peer.on('open', (peerId: string) => {
        console.log('Peer opened with id:', peerId);
        resolve({ peer, id: peerId });
      });

      peer.on('error', (err) => {
        console.error('Peer creation error:', err);
        reject(err);
      });
    });
  };

  const connectToPeer = (peer: Peer, hostId: string, name: string): DataConnection => {
    console.log('Attempting to connect to host:', hostId);
    const connection = peer.connect(hostId);
    
    connection.on('open', () => {
      console.log('Connection opened with host');
      connection.send({ type: 'join', id: peer.id, name });
    });

    connection.on('data', (data: unknown) => {
      const message = data as PeerMessage;
      console.log('Received message from host:', message);
      
      if (message.type === 'peerList' && message.peers) {
        console.log('Received peer list:', message.peers);
      } else if (message.type === 'hostLeft') {
        console.log('Host left the game');
        handleHostDisconnection();
      }
    });

    connection.on('close', () => {
      console.log('Connection to host closed');
      // If we're not the host and we lose connection to the host, leave the game
      if (hostId !== peer.id) {
        handleHostDisconnection();
      }
    });

    connection.on('error', (err) => {
      console.error('Connection error:', err);
    });

    return connection;
  };

  const handleHostDisconnection = (): void => {
    console.log('Handling host disconnection');
    if (currentPeer) {
      cleanupPeer(currentPeer);
    }
    clearStore();
    setIsInGame(false);
    setIsCreating(false);
    setIsJoining(false);
  };

  const setupHost = (peer: Peer): void => {
    console.log('Setting up host with peer ID:', peer.id);

    peer.on('connection', (connection) => {
      console.log('New connection received from:', connection.peer);
      
      connection.on('open', () => {
        console.log('Connection opened with peer:', connection.peer);
      });

      connection.on('data', (data: unknown) => {
        const message = data as PeerMessage;
        console.log('Received message from peer:', message);
        
        if (message.type === 'join' && message.id && message.name) {
          console.log('Adding peer to store:', message.id, message.name);
          
          addPeer({
            id: message.id,
            name: message.name,
            connection,
          });

          const peerList = getPeerList();
          console.log('Broadcasting peer list:', peerList);
          
          connectedPeers.forEach((peer) => {
            peer.connection.send({ 
              type: 'peerList', 
              peers: peerList.map(p => ({ id: p.id, name: p.name }))
            });
          });
        } else if (message.type === 'leave' && message.id) {
          console.log('Peer leaving:', message.id);
          removePeer(message.id);
          
          const peerList = getPeerList();
          connectedPeers.forEach((peer) => {
            peer.connection.send({ 
              type: 'peerList', 
              peers: peerList.map(p => ({ id: p.id, name: p.name }))
            });
          });
        }
      });

      connection.on('close', () => {
        console.log('Connection closed with peer:', connection.peer);
        removePeer(connection.peer);
        
        const peerList = getPeerList();
        connectedPeers.forEach((peer) => {
          peer.connection.send({ 
            type: 'peerList', 
            peers: peerList.map(p => ({ id: p.id, name: p.name }))
          });
        });
      });

      connection.on('error', (err) => {
        console.error('Connection error:', err);
      });
    });

    peer.on('error', (err) => {
      console.error('Host peer error:', err);
    });
  };

  const cleanupPeer = (peer: Peer): void => {
    if (hostId === peer.id) {
      // If host is leaving, notify all peers
      connectedPeers.forEach((connectedPeer) => {
        connectedPeer.connection.send({ type: 'hostLeft' });
      });
    } else {
      // If regular peer is leaving, just notify the host
      connectedPeers.forEach((connectedPeer) => {
        connectedPeer.connection.send({ type: 'leave', id: peer.id });
      });
    }

    const connections = peer.connections;
    if (connections) {
      Object.values(connections).flat().forEach((connection: DataConnection) => {
        connection.close();
      });
    }

    peer.destroy();
  };

  const createGame = async (playerName: string): Promise<void> => {
    if (!playerName || isCreating) return;
    
    setIsCreating(true);
    try {
      console.log('Creating new game...');
      const { peer, id } = await createPeer();
      console.log('Peer created with ID:', id);
      
      setCurrentPeer(peer);
      setHostId(id);
      setupHost(peer);
      setIsInGame(true);
    } catch (error) {
      console.error('Failed to create game:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const joinGame = async (gameId: string, playerName: string): Promise<void> => {
    if (!gameId || !playerName || isJoining) return;
    
    setIsJoining(true);
    try {
      console.log('Joining game with ID:', gameId);
      const { peer } = await createPeer();
      console.log('Peer created, connecting to host:', gameId);
      
      setCurrentPeer(peer);
      setHostId(gameId);
      connectToPeer(peer, gameId, playerName);
      setIsInGame(true);
    } catch (error) {
      console.error('Failed to join game:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const leaveGame = (): void => {
    if (currentPeer) {
      cleanupPeer(currentPeer);
    }
    clearStore();
    setIsInGame(false);
    setIsCreating(false);
    setIsJoining(false);
  };

  return {
    currentPeer,
    hostId,
    isInGame,
    isCreating,
    isJoining,
    createGame,
    joinGame,
    leaveGame,
  };
} 