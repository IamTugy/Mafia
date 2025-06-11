import type { DataConnection, Peer } from 'peerjs';
import { createPeer, parseMessage } from './peer-utils';

export const createClientPeer = async (
  hostId: string,
  name: string,
  onOpen: (connection: DataConnection) => void,
  onData: (data: unknown) => void,
  onClose: () => void,
  onError: (error: Error) => void
): Promise<{ peer: Peer; connection: DataConnection }> => {
  const peer = await createPeer();

  // Add error handler for the peer itself
  peer.on('error', (err) => {
    console.error('Peer error:', err);
    onError(err);
  });

  const connection = peer.connect(hostId);

  // Add timeout for connection (10 seconds)
  const connectionTimeout = setTimeout(() => {
    if (!connection.open) {
      onError(new Error('Connection timeout. Please check the game code and try again.'));
      peer.destroy();
    }
  }, 10000);

  connection.on('open', async () => {
    clearTimeout(connectionTimeout);
    await connection.send(
      parseMessage({
        type: 'join',
        id: peer.id,
        name,
      })
    );
    onOpen(connection);
  });

  connection.on('data', (data: unknown) => {
    onData(data);
  });

  connection.on('close', () => {
    clearTimeout(connectionTimeout);
    onClose();
  });

  connection.on('error', (err) => {
    console.error('Connection error:', err);
    clearTimeout(connectionTimeout);
    onError(err);
  });

  return { peer, connection };
};
