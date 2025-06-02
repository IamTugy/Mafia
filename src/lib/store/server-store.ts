import { create } from 'zustand';
import type { DataConnection, Peer } from 'peerjs';
import type { Role, PlayerData, GameState } from './types';
import { getRandomRoleImage } from '../utils/role-images';

export interface ConnectedClient {
  playerData: PlayerData;
  connection: DataConnection;
}

export interface HostState {
  id?: string;
  peer: Peer | null;
  isActive: boolean;
}

interface ServerState {
  gameState: GameState;
  clients: ConnectedClient[];
  host: HostState;
}

interface ServerStore extends ServerState {
  setGameState: (state: GameState) => void;

  // Host management
  setHost: (host: Partial<HostState>) => void;
  setHostActive: (isActive: boolean) => void;
  leaveGame: () => void;

  // Client management
  addClient: (client: ConnectedClient) => void;
  removeClient: (clientId: string) => void;
  updateClientPlayerData: (clientId: string, data: Partial<PlayerData>) => void;
  updateClientStatus: (clientId: string, status: 'waiting' | 'inGame') => void;
  getClientById: (id: string) => ConnectedClient | undefined;
  getWaitingClients: () => ConnectedClient[];
  getInGameClients: () => ConnectedClient[];
  moveClientToGame: (clientId: string) => void;
  moveClientToWaiting: (clientId: string) => void;

  // Game management
  initializeGame: () => void;

  // Clear store
  clearStore: () => void;
}

const INITIAL_GAME_STATE: GameState = {
  phase: 'waiting',
  day: 0,
};

const INITIAL_HOST_STATE: HostState = {
  id: undefined,
  peer: null,
  isActive: false,
};

export const useServerStore = create<ServerStore>((set, get) => ({
  // Initial state
  gameState: INITIAL_GAME_STATE,
  clients: [],
  host: INITIAL_HOST_STATE,

  // Game state actions
  setGameState: (state: GameState) => set({ gameState: state }),

  // Host management actions
  setHost: (host: Partial<HostState>) => {
    const { host: currentHost } = get();
    set({ host: { ...currentHost, ...host } });
  },

  setHostActive: (isActive: boolean) => {
    const { host: currentHost } = get();
    set({ host: { ...currentHost, isActive } });
  },

  leaveGame: () => {
    set(() => ({
      host: INITIAL_HOST_STATE,
      clients: [],
      gameState: INITIAL_GAME_STATE,
    }));
  },

  // Clients management
  addClient: (client: ConnectedClient) => {
    set((state) => ({
      clients: [...state.clients, client],
    }));
  },

  removeClient: (clientId: string) => {
    set((state) => ({
      clients: state.clients.filter((client) => client.playerData.id !== clientId),
    }));
  },

  updateClientPlayerData: (clientId: string, data: Partial<PlayerData>) => {
    set((state) => ({
      clients: state.clients.map((client) =>
        client.playerData.id === clientId
          ? { ...client, playerData: { ...client.playerData, ...data } }
          : client
      ),
    }));
  },

  updateClientStatus: (clientId: string, status: 'waiting' | 'inGame') => {
    get().updateClientPlayerData(clientId, { status });
  },

  getClientById: (id: string) => {
    return get().clients.find((client) => client.playerData.id === id);
  },

  getWaitingClients: () => {
    return get().clients.filter((client) => client.playerData.status === 'waiting');
  },

  getInGameClients: () => {
    return get().clients.filter((client) => client.playerData.status === 'inGame');
  },

  moveClientToGame: (clientId: string) => {
    get().updateClientStatus(clientId, 'inGame');
  },

  moveClientToWaiting: (clientId: string) => {
    get().updateClientStatus(clientId, 'waiting');
  },

  // Game management
  initializeGame: () => {
    const inGameClients = get().getInGameClients();
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
        if (client.playerData.status === 'inGame') {
          const gameIndex = inGameClients.findIndex(
            (c) => c.playerData.id === client.playerData.id
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
      host: INITIAL_HOST_STATE,
    }),
}));
