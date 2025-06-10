import Peer from 'peerjs';
import { useClientStore } from '@/lib/store/client-store';
import { validateGameState, validatePlayerData, validatePlayersList, type MessageContent } from '@/lib/store/types';
import { cleanupPeer, createPeer, parseMessage } from '../utils/peer-utils';
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
  const { setPlayersList, setCurrentPlayerData, setGameState, setHost, clearStore, host } =
    useClientStore();

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (type: string, content?: MessageContent) => {
    if (!host?.connection?.open) {
      console.error('No active connection to host');
      return;
    }

    try {
      const message = parseMessage({ type, ...content });
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

    switch (message.type) {
      case 'playerData':
        // Received individual player data and players list
        if (message.playerData) {
          const validatedPlayerData = validatePlayerData(message.playerData);
          if (validatedPlayerData) {
            setCurrentPlayerData(validatedPlayerData);
          }
        }
        if (message.playersList) {
          const validatedPlayersList = validatePlayersList(message.playersList);
          if (validatedPlayersList) {
            setPlayersList(validatedPlayersList);
          }
        }
        break;

      case 'gameState':
        // Received game state update
        if (message.gameState) {
          const validatedGameState = validateGameState(message.gameState);
          if (validatedGameState) {
            setGameState(validatedGameState);
          }
        }
        break;

      case 'hostLeft':
        clearStore();
        break;

      default:
        console.error('Unknown message type:', message.type);
        break;
    }
  };

  const connectToHost = async (hostId: string, name: string): Promise<void> => {
    setConnecting(true);
    setError(null); // Clear any previous errors

    if (host?.connection?.open) {
      setError('Already connected to a host');
      setConnecting(false);
      return;
    }

    let peer: Peer;
    let connectionTimeout: NodeJS.Timeout | undefined;

    try {
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
      setError(
        'Failed to create peer connection. Please check your internet connection and try again.'
      );
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
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setError(null); // Clear error on successful connection
        setConnecting(false); // Set connecting to false on success
        await connection.send(
          parseMessage({
            type: 'join',
            id: peer.id,
            name,
          })
        );
      });

      connection.on('data', (data: unknown) => {
        onMessageReceived(data);
      });

      connection.on('close', () => {
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setError('Connection to host was closed');
        setConnecting(false);
        clearStore();
      });

      connection.on('error', (err) => {
        console.error('Connection error:', err);
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setError(
          `Failed to connect to host: ${err.message || 'Please check the game code and try again'}`
        );
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
    cleanupPeer(peer, host?.id);
    clearStore();
  };

  const isConnected = host?.connection?.open ?? false;

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
