import type { DataConnection, Peer } from 'peerjs';
import { createPeer, parseMessage } from './peer-utils';
import {
  MessageTypeSchema,
  StatusSchema,
  type ConnectedClient,
  type HostState,
} from '@/lib/store/types';

export const broadcastPlayerData = (host: HostState, clients: ConnectedClient[]) => {
  console.log('broadcastPlayerData', host, clients);
  if (!host.isActive) return;

  clients.forEach(async (client) => {
    if (client.connection && client.connection.open) {
      const playersList = clients.map((c) => ({
        id: c.playerData.id,
        name: c.playerData.name,
        index: c.playerData.index,
        status: c.playerData.status,
      }));

      const message = parseMessage({
        type: MessageTypeSchema.enum.playerState,
        playerData: client.playerData,
        playersList,
      });

      try {
        client.connection.send(message);
      } catch (error) {
        console.error('Error sending player data to client:', client.playerData.id, error);
      }
    }
  });
};

export const notifyHostLeft = (clients: ConnectedClient[]): void => {
  // Notify all clients that host is leaving
  clients.forEach(async (client) => {
    if (client.connection && client.connection.open) {
      try {
        const message = parseMessage({ type: MessageTypeSchema.enum.hostLeft });
        client.connection.send(message);
      } catch (error) {
        console.error('Error notifying client of host disconnect:', error);
      }
    }
  });
};

export const createServerPeer = async (
  onJoin: (client: ConnectedClient) => void,
  onLeave: (clientId: string) => void,
  onError: (error: Error) => void
): Promise<Peer> => {
  const peer = await createPeer(true);

  peer.on('connection', (connection: DataConnection) => {
    connection.on('open', () => {
      console.log('Connection opened with peer:', connection.peer);
    });

    connection.on('data', (data: unknown) => {
      const message = parseMessage(data);
      if (!message) {
        console.error('Failed to parse message from client:', connection.peer);
        return;
      }

      switch (message.type) {
        case 'join':
          if (message.id && message.name) {
            onJoin({
              playerData: {
                id: message.id,
                name: message.name,
                status: StatusSchema.enum.waiting,
              },
              connection,
            });
          }
          break;

        case 'leave':
          if (message.id) {
            onLeave(message.id);
          }
          break;

        default:
          console.error('Unknown message type:', message.type);
          break;
      }
    });

    connection.on('close', () => {
      onLeave(connection.peer);
    });

    connection.on('error', (err) => {
      console.error('Connection error:', err);
      onError(err);
    });
  });

  peer.on('error', (err) => {
    console.error('Host peer error:', err);
    onError(err);
  });

  return peer;
};
