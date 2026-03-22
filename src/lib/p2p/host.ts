import type { DataConnection, Peer } from 'peerjs';
import { createPeer, parseP2PMessage, serializeP2PMessage, destroyPeer } from './peer-utils';

export interface HostP2PCallbacks<TAction> {
  onClientJoin: (id: string, name: string, connection: DataConnection) => void;
  onClientRejoin: (originalId: string, connection: DataConnection) => void;
  onClientLeave: (clientId: string) => void;
  onClientAction: (clientId: string, action: TAction) => void;
  onError: (error: Error) => void;
}

export const createHostP2P = async <TAction>(
  callbacks: HostP2PCallbacks<TAction>,
  peerId?: string
): Promise<Peer> => {
  const peer = await createPeer(!peerId, peerId);

  peer.on('connection', (connection: DataConnection) => {
    connection.on('open', () => {
      console.log('Client connected:', connection.peer);
    });

    connection.on('data', (data: unknown) => {
      const message = parseP2PMessage(data);
      if (!message) {
        console.error('Failed to parse message from client:', connection.peer);
        return;
      }
      switch (message.type) {
        case 'join':
          callbacks.onClientJoin(message.id, message.name, connection);
          break;
        case 'rejoin':
          callbacks.onClientRejoin(message.originalId, connection);
          break;
        case 'leave':
          callbacks.onClientLeave(message.id);
          break;
        case 'action':
          callbacks.onClientAction(connection.peer, message.payload as TAction);
          break;
        default:
          console.warn('Unexpected message type from client:', message.type);
      }
    });

    connection.on('close', () => {
      callbacks.onClientLeave(connection.peer);
    });

    connection.on('error', (err) => {
      console.error('Connection error:', err);
      callbacks.onError(err);
    });
  });

  peer.on('error', (err) => {
    console.error('Host peer error:', err);
    callbacks.onError(err);
  });

  return peer;
};

export const sendToClient = <TState>(
  connection: DataConnection,
  state: TState
): void => {
  if (connection.open) {
    connection.send(serializeP2PMessage({ type: 'stateUpdate', state }));
  }
};

export const sendRawToClient = (connection: DataConnection, payload: unknown): void => {
  if (connection.open) {
    connection.send(serializeP2PMessage({ type: 'becomeHost', snapshot: payload }));
  }
};

export const notifyAllHostLeft = (connections: DataConnection[]): void => {
  const message = serializeP2PMessage({ type: 'hostLeft' });
  for (const conn of connections) {
    if (conn.open) {
      try {
        conn.send(message);
      } catch (err) {
        console.error('Error notifying client of host disconnect:', err);
      }
    }
  }
};

export { destroyPeer };
