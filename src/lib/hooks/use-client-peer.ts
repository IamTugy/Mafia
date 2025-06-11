import type { Peer } from 'peerjs';
import { useClientStore } from '@/lib/store/client-store';
import { cleanupPeer, parseMessage } from '../utils/peer-utils';
import { useCallback } from 'react';
import type { MessageContent } from '@/lib/store/types';

interface UseClientPeerReturn {
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
    initializeClient,
    clearStore,
    host,
    isConnecting,
    error,
  } = useClientStore();

  const sendMessage = async (type: string, content?: MessageContent) => {
    if (!host?.connection?.open) {
      console.error('No active connection to host');
      return;
    }

    try {
      const message = parseMessage({ type, ...(content || {}) });
      await host.connection.send(message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const connectToHost = async (hostId: string, name: string): Promise<void> => {
    await initializeClient(hostId, name);
  };

  const enhancedCleanupPeer = useCallback((peer: Peer): void => {
    cleanupPeer(peer, host?.id);
    clearStore();
  }, [host?.id, clearStore]);

  const isConnected = host?.connection?.open ?? false;

  return {
    connectToHost,
    sendMessage,
    cleanupPeer: enhancedCleanupPeer,
    // Client state
    isConnected,
    isConnecting,
    error,
    leaveGame: () => {
      if (host?.connection) {
        host.connection.close();
      }
      clearStore();
    },
  };
}
