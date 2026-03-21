import type { Peer } from 'peerjs';
import { useClientStore } from '@/lib/store/client-store';
import { destroyPeer } from '@/lib/p2p/peer-utils';
import { useCallback } from 'react';
import type { MafiaAction } from '@/lib/store/types';

interface UseClientPeerReturn {
  connectToHost: (hostId: string, name: string) => Promise<void>;
  sendAction: (action: MafiaAction) => void;
  cleanupPeer: (peer: Peer) => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  leaveGame: () => void;
}

export function useClientPeer(): UseClientPeerReturn {
  const { initializeClient, sendAction, clearStore, host, isConnecting, error } =
    useClientStore();

  const connectToHost = async (hostId: string, name: string): Promise<void> => {
    await initializeClient(hostId, name);
  };

  const enhancedCleanupPeer = useCallback(
    (peer: Peer): void => {
      destroyPeer(peer);
      clearStore();
    },
    [clearStore]
  );

  const isConnected = host?.connection?.open ?? false;

  return {
    connectToHost,
    sendAction,
    cleanupPeer: enhancedCleanupPeer,
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
