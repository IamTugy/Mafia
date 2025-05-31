import { useState } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { usePeerStore } from '@/lib/store/peer-store';
import type { GameState } from '@/lib/store/peer-store';

interface PeerMessage {
  type: 'join' | 'leave' | 'peerList' | 'message' | 'hostLeft' | 'gameState';
  id?: string;
  name?: string;
  content?: string;
  peers?: { id: string; name: string }[];
  gameState?: GameState;
  playerName?: string;
}

type MessageContent = {
  peers?: { id: string; name: string }[];
  gameState?: GameState;
  id?: string;
};

interface UsePeerReturn {
  currentPeer: Peer | null;
  hostId: string;
  isInGame: boolean;
  isCreating: boolean;
  isJoining: boolean;
  error: string | null;
  createGame: (playerName: string) => Promise<void>;
  joinGame: (gameId: string, playerName: string) => Promise<void>;
  leaveGame: () => void;
  broadcastGameState: (newState: Partial<GameState>) => void;
}

const generateShortId = (): string => {
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
};

export function usePeer(): UsePeerReturn {
  const [isInGame, setIsInGame] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { 
    hostId, 
    currentPeer, 
    setHostId, 
    setCurrentPeer, 
    addPeer, 
    removePeer, 
    setConnectedPeers,
    connectedPeers,
    updateGameState,
    gameState,
    clearStore 
  } = usePeerStore();

  console.log(connectedPeers);

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
        setError(null);
        resolve({ peer, id: peerId });
      });

      peer.on('error', (err) => {
        console.error('Peer creation error:', err);
        const errorMessage = err.type === 'peer-unavailable' 
          ? 'Game code not found - please check the code and try again'
          : 'Failed to connect to game - please try again';
        setError(errorMessage);
        reject(err);
      });
    });
  };

  // Broadcast game state to all peers except current peer
  const broadcastGameState = async (newState: Partial<GameState>) => {
    const updatedState = { ...gameState, ...newState };
    updateGameState(newState);
    
    // Get latest peers from store
    const latestPeers = usePeerStore.getState().connectedPeers;
    const currentPeerInstance = usePeerStore.getState().currentPeer;
    
    latestPeers.forEach(async (p) => {
      if (p.id !== currentPeerInstance?.id && p.connection) {
        await p.connection.send({
          type: 'gameState',
          gameState: updatedState
        });
      }
    });
  };

  // Broadcast message to all peers except current peer
  const broadcastMessage = async (type: PeerMessage['type'], content?: MessageContent) => {
    // Get latest peers from store
    const latestPeers = usePeerStore.getState().connectedPeers;
    const currentPeerInstance = usePeerStore.getState().currentPeer;
    
    latestPeers.forEach(async (p) => {
      if (p.id !== currentPeerInstance?.id && p.connection) {
        await p.connection.send({
          type,
          ...content
        });
      }
    });
  };

  const handleMessage = (message: PeerMessage) => {
    switch (message.type) {
      case 'gameState':
        if (message.gameState) {
          updateGameState(message.gameState);
        }
        break;
      case 'hostLeft':
        handleHostDisconnection();
        break;
      case 'peerList':
        if (message.peers) {
          // Convert serializable peers back to ConnectedPeer format for the store
          const peersForStore = message.peers.map(p => ({
            id: p.id,
            name: p.name,
            connection: undefined // Connection will be undefined for remote peers
          }));
          setConnectedPeers(peersForStore);
          console.log('Current connected peers:', peersForStore);
        }
        break;
    }
  };

  const connectToPeer = (peer: Peer, hostId: string, name: string): DataConnection => {
    console.log('Attempting to connect to host:', hostId);
    const connection = peer.connect(hostId);

    connection.on('open', async () => {
      console.log('Connection opened with host');
      setError(null);
      addPeer({
        id: peer.id,
        name,
      });
      await connection.send({ type: 'join', id: peer.id, name });
      setIsInGame(true);
    });

    connection.on('data', (data: unknown) => {
      const message = data as PeerMessage;
      console.log('Received message from host:', message);
      handleMessage(message);
    });

    connection.on('close', () => {
      console.log('Connection to host closed');
      if (hostId !== peer.id) {
        handleHostDisconnection();
      }
    });

    connection.on('error', (err) => {
      console.error('Connection error:', err);
      setError('Could not connect to game - please check if the game code is correct');
      if (peer) {
        peer.destroy();
      }
      clearStore();
      setIsInGame(false);
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

  const setupHost = (peer: Peer, playerName: string): void => {
    console.log('Setting up host with peer ID:', peer.id);
    
    // Add the host itself to the connected peers list
    addPeer({
      id: peer.id,
      name: playerName,
      connection: undefined
    });

    peer.on('connection', (connection: DataConnection) => {
      console.log('New connection received from:', connection.peer);
      
      connection.on('open', () => {
        console.log('Connection opened with peer:', connection.peer);
      });

      connection.on('data', (data: unknown) => {
        const message = data as PeerMessage;
        console.log('Received message from peer:', message);
        
        if (message.type === 'join' && message.id && message.name) {
          console.log('Adding peer to store:', message.id, message.name);
          
          // Add the new peer to the store
          addPeer({
            id: message.id,
            name: message.name,
            connection,
          });

          // Get the latest state from the store after adding the peer
          const latestPeers = usePeerStore.getState().connectedPeers;
          // Filter out connection objects for serialization
          const serializablePeers = latestPeers.map(p => ({ id: p.id, name: p.name }));
          console.log('Broadcasting peer list:', serializablePeers);
          broadcastMessage('peerList', { peers: serializablePeers });
          
        } else if (message.type === 'leave' && message.id) {
          console.log('Peer leaving:', message.id);
          removePeer(message.id);
          const latestPeers = usePeerStore.getState().connectedPeers;
          const serializablePeers = latestPeers.map(p => ({ id: p.id, name: p.name }));
          broadcastMessage('peerList', { peers: serializablePeers });
        }
      });

      connection.on('close', () => {
        console.log('Connection closed with peer:', connection.peer);
        removePeer(connection.peer);
        const latestPeers = usePeerStore.getState().connectedPeers;
        const serializablePeers = latestPeers.map(p => ({ id: p.id, name: p.name }));
        broadcastMessage('peerList', { peers: serializablePeers });
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
      broadcastMessage('hostLeft');
    } else {
      // If regular peer is leaving, just notify the host
      broadcastMessage('leave', { id: peer.id });
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
      setupHost(peer, playerName);
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
    setError(null);
    
    try {
      console.log('Joining game with ID:', gameId);
      const { peer } = await createPeer();
      console.log('Peer created, connecting to host:', gameId);
      
      setCurrentPeer(peer);
      setHostId(gameId);
      connectToPeer(peer, gameId, playerName);
    } catch (error) {
      console.error('Failed to join game:', error);
      if (currentPeer) {
        currentPeer.destroy();
      }
      clearStore();
      setIsInGame(false);
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
    error,
    createGame,
    joinGame,
    leaveGame,
    broadcastGameState,
  };
} 