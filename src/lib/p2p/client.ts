import type { DataConnection, Peer } from 'peerjs';
import { createPeer, parseP2PMessage, serializeP2PMessage, destroyPeer } from './peer-utils';

const SESSION_ORIGINAL_ID_KEY = 'mafia_rejoin_original_id';
const SESSION_HOST_ID_KEY = 'mafia_last_host_id';

export const storeRejoinInfo = (playerId: string, hostId: string): void => {
  sessionStorage.setItem(SESSION_ORIGINAL_ID_KEY, playerId);
  sessionStorage.setItem(SESSION_HOST_ID_KEY, hostId);
};

export const getStoredRejoinInfo = (): { originalId: string; hostId: string } | null => {
  const originalId = sessionStorage.getItem(SESSION_ORIGINAL_ID_KEY);
  const hostId = sessionStorage.getItem(SESSION_HOST_ID_KEY);
  return originalId && hostId ? { originalId, hostId } : null;
};

export const clearRejoinInfo = (): void => {
  sessionStorage.removeItem(SESSION_ORIGINAL_ID_KEY);
  sessionStorage.removeItem(SESSION_HOST_ID_KEY);
};

export interface ClientP2PCallbacks<TState> {
  onConnected: () => void;
  onStateUpdate: (state: TState) => void;
  onBecomeHost: (snapshot: unknown) => void;
  onHostLeft: () => void;
  onClose: () => void;
  onError: (error: Error) => void;
}

export const createClientP2P = async <TState>(
  hostId: string,
  playerName: string,
  callbacks: ClientP2PCallbacks<TState>,
  skipRejoin = false
): Promise<{ peer: Peer; connection: DataConnection }> => {
  const peer = await createPeer();

  peer.on('error', (err) => {
    console.error('Peer error:', err);
    callbacks.onError(err);
  });

  const connection = peer.connect(hostId);

  const connectionTimeout = setTimeout(() => {
    if (!connection.open) {
      callbacks.onError(
        new Error('Connection timeout. Please check the game code and try again.')
      );
      peer.destroy();
    }
  }, 10000);

  connection.on('open', async () => {
    clearTimeout(connectionTimeout);

    const rejoinInfo = skipRejoin ? null : getStoredRejoinInfo();
    let myId: string;
    if (rejoinInfo && rejoinInfo.hostId === hostId) {
      connection.send(
        serializeP2PMessage({ type: 'rejoin', originalId: rejoinInfo.originalId })
      );
      myId = rejoinInfo.originalId;
    } else {
      connection.send(
        serializeP2PMessage({ type: 'join', id: peer.id, name: playerName })
      );
      storeRejoinInfo(peer.id, hostId);
      myId = peer.id;
    }

    // Notify the host immediately when the tab/app closes — WebRTC ICE timeout
    // can take 30–60 s, so beforeunload is the only reliable fast signal.
    const handleUnload = () => {
      connection.send(serializeP2PMessage({ type: 'leave', id: myId }));
    };
    window.addEventListener('beforeunload', handleUnload);
    // Remove the listener once the connection closes normally.
    connection.once('close', () => window.removeEventListener('beforeunload', handleUnload));

    callbacks.onConnected();
  });

  connection.on('data', (data: unknown) => {
    const message = parseP2PMessage(data);
    if (!message) {
      console.error('Failed to parse message from host');
      return;
    }
    switch (message.type) {
      case 'stateUpdate':
        callbacks.onStateUpdate(message.state as TState);
        break;
      case 'becomeHost':
        callbacks.onBecomeHost(message.snapshot);
        break;
      case 'hostLeft':
        callbacks.onHostLeft();
        break;
      default:
        console.warn('Unexpected message type from host:', message.type);
    }
  });

  connection.on('close', () => {
    clearTimeout(connectionTimeout);
    callbacks.onClose();
  });

  connection.on('error', (err) => {
    console.error('Connection error:', err);
    clearTimeout(connectionTimeout);
    callbacks.onError(err);
  });

  return { peer, connection };
};

export const sendActionToHost = (connection: DataConnection, action: unknown): void => {
  if (connection.open) {
    connection.send(serializeP2PMessage({ type: 'action', payload: action }));
  }
};

export { destroyPeer };
