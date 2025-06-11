import { create } from 'zustand';
import { type Role, type PlayerData, type GameState, StatusSchema, type ConnectedClient, type HostState, MessageTypeSchema } from './types';
import { getRandomRoleImage } from '../utils/role-images';
import { createServerPeer, notifyHostLeft } from '../utils/server-utils';
import { MAX_PLAYERS } from '../consts';
import { parseMessage } from '../utils/peer-utils';

interface ServerState {
  gameState: GameState;
  clients: ConnectedClient[];
  host?: HostState;
}

interface ServerStore extends ServerState {
  setGameState: (state: GameState) => void;

  // Host management
  initializeHost: () => Promise<HostState>;
  setHostActive: (isActive: boolean) => void;
  leaveGame: () => void;

  // Client management
  addClient: (client: ConnectedClient) => void;
  removeClient: (clientId: string) => void;
  updateClientPlayerData: (clientId: string, data: Partial<PlayerData>) => void;
  getClientById: (id: string) => ConnectedClient | undefined;
  moveClientToGame: (clientId: string) => void;
  moveClientToWaiting: (clientId: string) => void;

  // Game management
  initializeGame: () => void;

  // Clear store
  clearStore: () => void;

  // Communication
  updateClientsState: () => void;
}

const INITIAL_GAME_STATE: GameState = {
  phase: 'waiting',
  day: 0,
};

export const useServerStore = create<ServerStore>((set, get) => ({
  // Initial state
  gameState: INITIAL_GAME_STATE,
  clients: [],
  host: undefined,

  // Getters
  initializeHost: async () => {
    const peer = await createServerPeer(
      (client) => {
        const inGamePlayers = get().clients.filter((c) => c.playerData.status === StatusSchema.enum.inGame).length;
        const clientWithStatus = {
          ...client,
          playerData: {
            ...client.playerData,
            status: inGamePlayers < MAX_PLAYERS ? StatusSchema.enum.inGame : StatusSchema.enum.waiting,
          },
        };
        get().addClient(clientWithStatus);
      },
      (clientId) => {
        get().removeClient(clientId);
      },
      (error) => {
        console.error('Server peer error:', error);
      }
    );

    const host = { peer, id: peer.id, isActive: true };

    set({ host });

    return host;
  },

  // Game state actions
  setGameState: (state: GameState) => set({ gameState: state }),

  setHostActive: (isActive: boolean) => {
    set((state) => ({ host: state.host ? { ...state.host, isActive } : undefined }));
  },

  leaveGame: () => {
    notifyHostLeft(get().clients);
    set({
      host: undefined,
      clients: [],
      gameState: INITIAL_GAME_STATE,
    });
  },

  // Clients management
  addClient: (client: ConnectedClient) => {
    set((state) => ({
      clients: [...state.clients, client],
    }));
    get().updateClientsState();
  },

  removeClient: (clientId: string) => {
    set((state) => ({
      clients: state.clients.filter((client) => client.playerData.id !== clientId),
    }));
    get().updateClientsState();
  },

  updateClientPlayerData: (clientId: string, data: Partial<PlayerData>) => {
    set((state) => ({
      clients: state.clients.map((client) =>
        client.playerData.id === clientId
          ? { ...client, playerData: { ...client.playerData, ...data } }
          : client
      ),
    }));
    get().updateClientsState();
  },

  getClientById: (id: string) => {
    return get().clients.find((client) => client.playerData.id === id);
  },

  moveClientToGame: (clientId: string) => {
    get().updateClientPlayerData(clientId, { status: StatusSchema.enum.inGame });
  },

  moveClientToWaiting: (clientId: string) => {
    get().updateClientPlayerData(clientId, { status: StatusSchema.enum.waiting });
  },

  // Game management
  initializeGame: () => {
    const inGameClients = get().clients.filter((c) => c.playerData.status === StatusSchema.enum.inGame);
    const roles: Role[] = [
      'don',
      'mafia',
      'mafia',
      'sheriff',
      'civilian',
      'civilian',
      'civilian',
      'civilian',
      'civilian',
      'civilian',
    ];
    const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);

    set((state) => ({
      clients: state.clients.map((client) => {
        if (client.playerData.status === StatusSchema.enum.inGame) {
          const gameIndex = inGameClients.findIndex(
            (c: ConnectedClient) => c.playerData.id === client.playerData.id
          );
          return {
            ...client,
            playerData: {
              ...client.playerData,
              index: gameIndex + 1,
              role: shuffledRoles[gameIndex],
              characterImage: getRandomRoleImage(shuffledRoles[gameIndex]),
            },
          };
        }
        return client;
      }),
    }));
  },

  // Clear store
  clearStore: () =>
    set({
      gameState: INITIAL_GAME_STATE,
      clients: [],
      host: undefined,
    }),

  // Communication
  updateClientsState: () => {
    const host = get().host;
    if (!host) return;
    const clients = get().clients;
    clients.forEach(async (client) => {
      if (client.connection && client.connection.open) {
        const message = parseMessage({ type: MessageTypeSchema.enum.playerState, playerState: {
          playerData: client.playerData,
          playersList: clients.map((c) => ({
            id: c.playerData.id,
            name: c.playerData.name,
            index: c.playerData.index,
            status: c.playerData.status,
          })),
          gameState: get().gameState,
        } });
        client.connection.send(message);
      }
    });
  },
}));
