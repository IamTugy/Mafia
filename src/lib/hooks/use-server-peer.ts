import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { useServerStore, type HostState } from '@/lib/store/server-store';
import { usePeer, serializeData, parseMessage } from './use-peer';
import { useCallback, useEffect } from 'react';

interface UseServerPeerReturn {
  broadcastGameState: () => void;
  broadcastPlayerData: () => void;
  moveClientToGame: (clientId: string) => void;
  moveClientToWaiting: (clientId: string) => void;
  startGame: () => void;
  cleanupPeer: (peer: Peer) => void;
  // Host management
  host: HostState;
  createGame: () => Promise<void>;
  leaveGame: () => void;
}

export function useServerPeer(): UseServerPeerReturn {
  const {
    addClient,
    removeClient,
    gameState,
    clients,
    moveClientToGame: moveToGame,
    moveClientToWaiting: moveToWaiting,
    initializeGame,
    // Host state and actions
    host,
    setHost,
    setHostActive,
    leaveGame: storeLeaveGame,
  } = useServerStore();

  const { createPeer, cleanupPeer } = usePeer(host?.peer?.id);

  const broadcastPlayerData = useCallback(() => {
    if (!host.isActive) return;

    clients.forEach(async (client) => {
      if (client.connection && client.connection.open) {
        const playersList = clients.map((c) => ({
          id: c.playerData.id,
          name: c.playerData.name,
          index: c.playerData.index,
          status: c.playerData.status,
        }));

        const message = serializeData({
          type: 'playerData',
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
  }, [clients, host.isActive]);

  const setupHost = useCallback(async () => {
    console.log('Creating new game as host...');

    const { peer, id } = await createPeer(true);

    console.log('Host peer created with ID:', id);

    setHost({ id, peer });

    peer.on('connection', (connection: DataConnection) => {
      console.log('New connection received from:', connection.peer);

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
              console.log('Adding client to server store:', message.id, message.name);

              addClient({
                playerData: {
                  id: message.id,
                  name: message.name,
                  status: 'waiting', // New clients start in waiting room
                },
                connection,
              });

              // Send updated data to all clients
              broadcastPlayerData();
            }
            break;

          case 'leave':
            if (message.id) {
              console.log('Client leaving:', message.id);
              removeClient(message.id);
              broadcastPlayerData();
            }
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      });

      connection.on('close', () => {
        console.log('Connection closed with peer:', connection.peer);
        removeClient(connection.peer);
        broadcastPlayerData();
      });

      connection.on('error', (err) => {
        console.error('Connection error:', err);
      });
    });

    peer.on('error', (err) => {
      console.error('Host peer error:', err);
    });
  }, [addClient, broadcastPlayerData, createPeer, removeClient, setHost]);

  // Create a host peer if it doesn't exist
  useEffect(() => {
    (async () => {
      if (!host.peer) {
        await setupHost();
      }
    })();
  }, [host.peer, setupHost]);

  const broadcastGameState = () => {
    if (!host.isActive) return;

    clients.forEach(async (client) => {
      if (client.connection && client.connection.open) {
        const message = serializeData({
          type: 'gameState',
          gameState,
        });
        try {
          client.connection.send(message);
        } catch (error) {
          console.error('Error sending game state to client:', client.playerData.id, error);
        }
      }
    });
  };

  const moveClientToGame = (clientId: string) => {
    moveToGame(clientId);
    broadcastPlayerData();
  };

  const moveClientToWaiting = (clientId: string) => {
    moveToWaiting(clientId);
    broadcastPlayerData();
  };

  const startGame = () => {
    initializeGame();
    broadcastPlayerData();
    broadcastGameState();
  };

  const createGame = async (): Promise<void> => {
    setHostActive(true);
  };

  const enhancedCleanupPeer = (peer: Peer): void => {
    if (host.isActive) {
      // Notify all clients that host is leaving
      clients.forEach(async (client) => {
        if (client.connection && client.connection.open) {
          try {
            const message = serializeData({ type: 'hostLeft' });
            client.connection.send(message);
          } catch (error) {
            console.error('Error notifying client of host disconnect:', error);
          }
        }
      });
    }
    cleanupPeer(peer);
    storeLeaveGame();
  };

  return {
    broadcastGameState,
    broadcastPlayerData,
    moveClientToGame,
    moveClientToWaiting,
    startGame,
    cleanupPeer: enhancedCleanupPeer,
    // Host management
    host,
    createGame,
    leaveGame: storeLeaveGame,
  };
}
