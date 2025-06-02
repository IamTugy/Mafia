import Peer from 'peerjs';
import { useClientStore } from '@/lib/store/client-store';
import { validateGameState, validatePlayerData, validatePlayersList } from '@/lib/store/types';
import { usePeer, serializeData, parseMessage, type MessageContent } from './use-peer';
import { useState } from 'react';

interface UseClientPeerReturn {
  createPeer: () => Promise<{ peer: Peer; id: string }>;
  connectToHost: (hostId: string, name: string) => Promise<void>;
  sendMessage: (type: string, content?: MessageContent) => Promise<void>;
  cleanupPeer: (peer: Peer) => void;
  // Client state
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  leaveGame: () => void;
}

export function useClientPeer(): UseClientPeerReturn {
  const {
    setPlayersList,
    setCurrentPlayerData,
    setGameState,
    setHost,
    clearStore,
    host,
  } = useClientStore();

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createPeer, cleanupPeer } = usePeer(host?.id);

  const sendMessage = async (type: string, content?: MessageContent) => {
    if (!host?.connection?.open) {
      console.error('No active connection to host');
      return;
    }

    try {
      const message = serializeData({ type, ...content });
      await host.connection.send(message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const onMessageReceived = (data: unknown) => {
    const message = parseMessage(data);
    if (!message) {
      console.error('Failed to parse message from host');
      return;
    }

    console.log('Received message:', message);

    switch (message.type) {
      case 'playerData':
        // Received individual player data and players list
        if (message.playerData) {
          const validatedPlayerData = validatePlayerData(message.playerData);
          if (validatedPlayerData) {
            setCurrentPlayerData(validatedPlayerData);
            console.log('Updated current player data:', validatedPlayerData);
          }
        }
        if (message.playersList) {
          const validatedPlayersList = validatePlayersList(message.playersList);
          if (validatedPlayersList) {
            setPlayersList(validatedPlayersList);
            console.log('Updated players list:', validatedPlayersList);
            
            // Log room status information for debugging
            const waitingCount = validatedPlayersList.filter(p => p.status === 'waiting').length;
            const inGameCount = validatedPlayersList.filter(p => p.status === 'inGame').length;
            console.log(`Room status - waiting: ${waitingCount}, in-game: ${inGameCount}`);
          }
        }
        break;

      case 'gameState':
        // Received game state update
        if (message.gameState) {
          const validatedGameState = validateGameState(message.gameState);
          if (validatedGameState) {
            setGameState(validatedGameState);
            console.log('Updated game state:', validatedGameState);
          }
        }
        break;

      case 'hostLeft':
        console.log('Host disconnected');
        clearStore();
        break;

      case 'message':
        console.log('Received message:', message.content);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const connectToHost = async (hostId: string, name: string): Promise<void> => {
    setConnecting(true);
    setError(null); // Clear any previous errors
    
    if (host?.connection?.open) {
      console.log('Already connected to a host');
      setError('Already connected to a host');
      setConnecting(false);
      return;
    }

    let peer: Peer;
    let connectionTimeout: NodeJS.Timeout | undefined;
    
    try {
      console.log('Creating client peer to connect to host:', hostId);
      const result = await createPeer();
      peer = result.peer;
      
      // Add error handler for the peer itself
      peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setError(`Connection failed: ${err.message || 'Unable to connect to the game server'}`);
        setConnecting(false);
        clearStore();
      });
      
    } catch (error) {
      console.error('Failed to create peer:', error);
      setError('Failed to create peer connection. Please check your internet connection and try again.');
      setConnecting(false);
      return;
    }

    try {
      const connection = peer.connect(hostId);
      
      // Add timeout for connection (10 seconds)
      connectionTimeout = setTimeout(() => {
        if (!connection.open) {
          setError('Connection timeout. Please check the game code and try again.');
          setConnecting(false);
          clearStore();
          if (peer) peer.destroy();
        }
      }, 10000);
      
      setHost({
        id: hostId,
        connection,
      });

      connection.on('open', async () => {
        console.log('Successfully connected to host');
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setError(null); // Clear error on successful connection
        setConnecting(false); // Set connecting to false on success
        await connection.send(serializeData({ 
          type: 'join', 
          id: peer.id, 
          name 
        }));
      });

      connection.on('data', (data: unknown) => {
        console.log('Received message from host:', data);
        onMessageReceived(data);
      });

      connection.on('close', () => {
        console.log('Connection to host closed');
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setError('Connection to host was closed');
        setConnecting(false);
        clearStore();
      });

      connection.on('error', (err) => {
        console.error('Connection error:', err);
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setError(`Failed to connect to host: ${err.message || 'Please check the game code and try again'}`);
        setConnecting(false);
        clearStore();
      });

    } catch (error) {
      console.error('Failed to connect to host:', error);
      if (connectionTimeout) clearTimeout(connectionTimeout);
      setError('Failed to connect to host. Please check the game code and try again.');
      setConnecting(false);
      clearStore();
    }
  };

  const enhancedCleanupPeer = (peer: Peer): void => {
    // For clients, we don't need to notify others when leaving
    console.log('Client leaving game');
    cleanupPeer(peer);
    clearStore();
  };

  const isConnected = host?.connection?.open ?? false;
  console.log('isConnected', isConnected, 'host', host);

  return {
    createPeer,
    connectToHost,
    sendMessage,
    cleanupPeer: enhancedCleanupPeer,
    // Client state
    isConnected,
    isConnecting: connecting,
    error,
    leaveGame: () => {
      if (host?.connection) {
        host.connection.close();
      }
      clearStore();
    },
  };
} 