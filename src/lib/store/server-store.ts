import { create } from 'zustand';
import {
  type Role,
  type PlayerData,
  type GameState,
  type GamePhase,
  StatusSchema,
  type ConnectedClient,
  type HostState,
  type MafiaAction,
  type MafiaClientState,
  type HostSnapshot,
  MafiaActionSchema,
  getAccusedList,
} from './types';
import { getRandomRoleImage } from '../utils/role-images';
import {
  createHostP2P,
  sendToClient,
  sendRawToClient,
  notifyAllHostLeft,
  destroyPeer,
} from '../p2p/host';
import { MIN_PLAYERS, MAX_PLAYERS, SPEAKER_NARRATION_BUFFER_MS, NIGHT_INVESTIGATION_MIN_MS, NIGHT_INVESTIGATION_MAX_MS } from '../consts';
import { computeRoles, isMafiaRole } from '../game/roles';
import { tallyKillVotes, tallyVotes, checkWinCondition } from '../game/voting';
import {
  getNextPhase,
  getAlivePlayers,
  getAliveSeats,
  buildSpeakerQueue,
  getNextFirstSpeaker,
} from '../game/phases';
import { NarrationEvent } from '../audio/narration-events';
import type { DataConnection } from 'peerjs';

interface ServerState {
  gameState: GameState;
  clients: ConnectedClient[];
  host?: HostState;
  backupHostId?: string;
  // Server-only (not broadcast)
  nightKillVotes: Record<string, string>;
  finalVoteChoices: Record<string, string>;
  mafiaSetupDone: string[];
}

interface ServerStore extends ServerState {
  setGameState: (state: GameState) => void;

  // Host management
  initializeHost: () => Promise<HostState>;
  initializeHostFromSnapshot: (snapshot: HostSnapshot) => Promise<HostState>;
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
  advanceSpeaker: () => void;
  endGame: () => void;
  pauseGame: (disconnectedPlayerId: string) => void;
  unpauseGame: () => void;
  eliminateDisconnectedPlayer: (playerId: string) => void;
  handleClientAction: (clientId: string, action: MafiaAction) => void;

  // Internal helpers (called by game.tsx timers)
  _replaceConnection: (clientId: string, conn: DataConnection) => void;
  _enterPhase: (phase: GamePhase, day: number) => void;
  _processNightKill: () => void;
  _processFinalVote: () => void;
  _eliminatePlayer: (playerId: string) => void;

  // Clear store
  clearStore: () => void;

  // Communication
  updateClientsState: () => void;
}

const INITIAL_GAME_STATE: GameState = { phase: 'waiting', day: 0 };

/** Tracks the last phase for which we sent a backup snapshot, to avoid flooding. */
let _lastSnapshotPhase: string = 'waiting';

/** Re-entry guard for advanceSpeaker to prevent concurrent calls. */
let _advancingSpeaker = false;

/** Pick a random alive player ID to be the narrator for a phase. */
const pickSpeaker = (clients: ConnectedClient[]): string | undefined =>
  getAlivePlayers(clients.map((c) => c.playerData)).sort(() => Math.random() - 0.5)[0]?.id;

const buildCallbacks = (get: () => ServerStore) => ({
  onClientJoin: (id: string, name: string, connection: DataConnection) => {
    const { clients } = get();

    // If a disconnected player with the same name exists, treat as rejoin
    const disconnected = clients.find(
      (c) =>
        c.playerData.status === StatusSchema.enum.disconnected &&
        c.playerData.name === name
    );
    if (disconnected) {
      const originalId = disconnected.playerData.id;
      // Replace connection first (uses old ID to find the client), then update the ID
      get()._replaceConnection(originalId, connection);
      get().updateClientPlayerData(originalId, { id, status: StatusSchema.enum.inGame });
      // Update any references to the old ID in game state
      const gs = get().gameState;
      const patch: Partial<typeof gs> = {};
      if (gs.pausedBy === originalId) patch.pausedBy = id;
      if (gs.speakerId === originalId) patch.speakerId = id;
      if (gs.lastEliminated === originalId) patch.lastEliminated = id;
      if (gs.readyPlayers?.includes(originalId)) {
        patch.readyPlayers = gs.readyPlayers.map((p) => (p === originalId ? id : p));
      }
      if (gs.accusations) {
        const newAcc: Record<string, string> = {};
        for (const [k, v] of Object.entries(gs.accusations)) {
          newAcc[k === originalId ? id : k] = v === originalId ? id : v;
        }
        patch.accusations = newAcc;
      }
      if (gs.disconnectVotes) {
        const newVotes: Record<string, 'eliminate' | 'wait'> = {};
        for (const [k, v] of Object.entries(gs.disconnectVotes)) {
          newVotes[k === originalId ? id : k] = v;
        }
        patch.disconnectVotes = newVotes;
      }
      if (Object.keys(patch).length > 0) {
        get().setGameState({ ...get().gameState, ...patch });
      }
      if (gs.pausedBy === originalId) {
        get().unpauseGame();
      }
      return;
    }

    const inGameCount = clients.filter(
      (c) => c.playerData.status === StatusSchema.enum.inGame
    ).length;
    const status =
      inGameCount < MAX_PLAYERS ? StatusSchema.enum.inGame : StatusSchema.enum.waiting;
    get().addClient({ playerData: { id, name, status }, connection });
  },
  onClientRejoin: (originalId: string, connection: DataConnection) => {
    const { clients, gameState } = get();
    const existing = clients.find((c) => c.playerData.id === originalId);
    if (existing) {
      const wasDisconnected = existing.playerData.status === StatusSchema.enum.disconnected;
      get().updateClientPlayerData(originalId, { status: StatusSchema.enum.inGame });
      get()._replaceConnection(originalId, connection);
      if (wasDisconnected && gameState.pausedBy === originalId) {
        get().unpauseGame();
      }
    } else {
      get().addClient({
        playerData: {
          id: originalId,
          name: `Player-${originalId.slice(-4)}`,
          status: StatusSchema.enum.waiting,
        },
        connection,
      });
    }
  },
  onClientLeave: (clientId: string) => {
    const { gameState, clients } = get();
    const client = clients.find(
      (c) => c.playerData.id === clientId || c.connection?.peer === clientId
    );
    if (!client) return;
    const actualId = client.playerData.id;
    const isGameActive = gameState.phase !== 'waiting' && gameState.phase !== 'ended';
    const isAlive = client.playerData.status === StatusSchema.enum.inGame;

    if (isGameActive && isAlive) {
      get().updateClientPlayerData(actualId, { status: StatusSchema.enum.disconnected });
      get().pauseGame(actualId);
    } else {
      get().removeClient(actualId);
    }
  },
  onClientAction: (clientId: string, action: MafiaAction) => {
    get().handleClientAction(clientId, action);
  },
  onError: (error: Error) => {
    console.error('Server peer error:', error);
  },
});

export const useServerStore = create<ServerStore>((set, get) => ({
  gameState: INITIAL_GAME_STATE,
  clients: [],
  host: undefined,
  backupHostId: undefined,
  nightKillVotes: {},
  finalVoteChoices: {},
  mafiaSetupDone: [],

  setGameState: (state) => set({ gameState: state }),

  initializeHost: async () => {
    const callbacks = buildCallbacks(get);
    const peer = await createHostP2P<MafiaAction>(callbacks);
    const host = { peer, id: peer.id, isActive: true };
    set({ host });
    return host;
  },

  initializeHostFromSnapshot: async (snapshot: HostSnapshot) => {
    const callbacks = buildCallbacks(get);
    // Use the backup host's known ID so other clients can connect to it
    const peer = await createHostP2P<MafiaAction>(callbacks, snapshot.backupHostId);
    const host = { peer, id: peer.id, isActive: true };
    set({
      host,
      gameState: snapshot.gameState,
      backupHostId: undefined,
      nightKillVotes: {},
      finalVoteChoices: {},
      mafiaSetupDone: [],
      clients: snapshot.players.map((p) => ({
        playerData: p,
        connection: null as unknown as DataConnection,
      })),
    });

    // After a grace period, mark any player who hasn't reconnected as disconnected,
    // and pick a new backup host from the connected players.
    setTimeout(() => {
      const { clients, gameState } = get();
      const stillDisconnected = clients.filter(
        (c) => !c.connection?.open && c.playerData.status === StatusSchema.enum.inGame
      );
      for (const c of stillDisconnected) {
        get().updateClientPlayerData(c.playerData.id, { status: StatusSchema.enum.disconnected });
        if (!gameState.pausedBy) {
          get().pauseGame(c.playerData.id);
        }
      }

      // Elect a new backup host from connected in-game players (skip the first
      // client which is the host's own loopback connection).
      const connected = get().clients.filter(
        (c) => c.connection?.open && c.playerData.status === StatusSchema.enum.inGame
      );
      const newBackup = connected.length > 1 ? connected[1] : connected[0];
      if (newBackup) {
        set({ backupHostId: newBackup.playerData.id });
        // Send snapshot to new backup
        const snap: HostSnapshot = {
          players: get().clients.map((c) => c.playerData),
          gameState: get().gameState,
          backupHostId: newBackup.playerData.id,
        };
        sendRawToClient(newBackup.connection, snap);
        get().updateClientsState();
      }
    }, 15000);

    return host;
  },

  setHostActive: (isActive) =>
    set((state) => ({ host: state.host ? { ...state.host, isActive } : undefined })),

  leaveGame: () => {
    const { host, clients, gameState, backupHostId } = get();

    // Send a fresh snapshot to the backup host before shutting down so
    // they have the most up-to-date state for failover.
    if (backupHostId && gameState.phase !== 'waiting' && gameState.phase !== 'ended') {
      const backupClient = clients.find((c) => c.playerData.id === backupHostId);
      if (backupClient?.connection?.open) {
        const snapshot: HostSnapshot = {
          players: clients.map((c) => c.playerData),
          gameState,
          backupHostId,
        };
        sendRawToClient(backupClient.connection, snapshot);
      }
    }

    // Notify all clients except the host-player's own connection (which is
    // a loopback) — the host player is intentionally leaving, not failing over.
    const hostPeerId = host?.id;
    const remoteConns = clients
      .filter((c) => c.connection?.peer !== hostPeerId)
      .map((c) => c.connection)
      .filter(Boolean);
    notifyAllHostLeft(remoteConns);
    // Reset state immediately so the host's own onClose handler
    // sees phase='waiting' and skips failover.
    set({
      host: undefined,
      clients: [],
      gameState: INITIAL_GAME_STATE,
      backupHostId: undefined,
      nightKillVotes: {},
      finalVoteChoices: {},
      mafiaSetupDone: [],
    });
    // Delay peer destruction to let messages flush over WebRTC
    if (host?.peer) setTimeout(() => destroyPeer(host.peer!), 200);
  },

  addClient: (client) => {
    set((state) => ({ clients: [...state.clients, client] }));
    get().updateClientsState();
  },

  removeClient: (clientId) => {
    set((state) => ({
      clients: state.clients.filter((c) => c.playerData.id !== clientId),
    }));
    get().updateClientsState();
  },

  updateClientPlayerData: (clientId, data) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.playerData.id === clientId ? { ...c, playerData: { ...c.playerData, ...data } } : c
      ),
    }));
    get().updateClientsState();
  },

  _replaceConnection: (clientId, connection) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.playerData.id === clientId ? { ...c, connection } : c
      ),
    }));
  },

  getClientById: (id) => get().clients.find((c) => c.playerData.id === id),

  moveClientToGame: (clientId) =>
    get().updateClientPlayerData(clientId, { status: StatusSchema.enum.inGame }),

  moveClientToWaiting: (clientId) =>
    get().updateClientPlayerData(clientId, { status: StatusSchema.enum.waiting }),

  initializeGame: () => {
    // Kick players on the waiting list — they don't get to play this round
    const waitingClients = get().clients.filter(
      (c) => c.playerData.status === StatusSchema.enum.waiting
    );
    for (const wc of waitingClients) {
      try {
        wc.connection?.close();
      } catch {
        // ignore
      }
    }
    set((state) => ({
      clients: state.clients.filter(
        (c) => c.playerData.status !== StatusSchema.enum.waiting
      ),
    }));

    const inGameClients = get().clients.filter(
      (c) => c.playerData.status === StatusSchema.enum.inGame
    );
    const roles = computeRoles(inGameClients.length);
    const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);

    // Assign random seat indices (1-based)
    const seatIndices = Array.from({ length: inGameClients.length }, (_, i) => i + 1).sort(
      () => Math.random() - 0.5
    );

    // Backup host must be a different player than the host itself.
    // The host player is always the first client (index 0) since they connect
    // to themselves before anyone else joins.
    const backupClient = inGameClients.length > 1 ? inGameClients[1] : inGameClients[0];
    const backupHostId = backupClient?.playerData.id;
    const speakerId = pickSpeaker(get().clients);

    set((state) => ({
      gameState: {
        phase: 'night.seating',
        day: 1,
        readyPlayers: [],
        phaseStartedAt: Date.now(),
        speakerId,
      },
      backupHostId,
      nightKillVotes: {},
      finalVoteChoices: {},
      mafiaSetupDone: [],
      clients: state.clients.map((client) => {
        if (client.playerData.status === StatusSchema.enum.inGame) {
          const idx = inGameClients.findIndex((c) => c.playerData.id === client.playerData.id);
          const role = shuffledRoles[idx] as Role;
          return {
            ...client,
            playerData: {
              ...client.playerData,
              index: seatIndices[idx],
              role,
              characterImage: getRandomRoleImage(role),
              investigationHistory: [],
              lastInvestigationResult: undefined,
              myVote: undefined,
              myKillVote: undefined,
            },
          };
        }
        return client;
      }),
    }));

    if (backupClient?.connection?.open) {
      const { clients, gameState } = get();
      const snapshot: HostSnapshot = {
        players: clients.map((c) => c.playerData),
        gameState,
        backupHostId: backupHostId!,
      };
      sendRawToClient(backupClient.connection, snapshot);
    }

    get().updateClientsState();
  },

  _enterPhase: (phase, day) => {
    const { gameState, clients } = get();

    // Skip donCheck entirely if no sheriff exists — don's ability is pointless without one
    if (phase === 'night.donCheck' && !clients.some((c) => c.playerData.role === 'sheriff')) {
      get()._enterPhase('day.start', day);
      return;
    }

    const inGamePlayers = clients
      .filter((c) => c.playerData.status === StatusSchema.enum.inGame)
      .map((c) => c.playerData);
    const speakerId = pickSpeaker(clients);
    const now = Date.now();

    let narrationEvent: string | undefined;
    let narrationContext: string | undefined;

    switch (phase) {
      case 'night.seating':    narrationEvent = NarrationEvent.SEATING; break;
      case 'night.roleReveal': narrationEvent = NarrationEvent.ROLE_REVEAL; break;
      case 'night.mafiaSetup': narrationEvent = NarrationEvent.MAFIA_WAKE; break;
      case 'night.mafiaKill':  narrationEvent = NarrationEvent.MAFIA_KILL_BEGIN; break;
      case 'night.sheriffCheck': narrationEvent = NarrationEvent.SHERIFF_WAKE; break;
      case 'night.donCheck':   narrationEvent = NarrationEvent.DON_WAKE; break;
      case 'day.start': {
        const eliminatedId = gameState.lastEliminated;
        if (eliminatedId) {
          // Deferred elimination: the player was targeted at night but kept as inGame
          // until now so they appeared alive during sheriff/don phases.
          const seat = clients.find((c) => c.playerData.id === eliminatedId)?.playerData.index;
          get()._eliminatePlayer(eliminatedId);
          narrationEvent = NarrationEvent.DEATH_ANNOUNCED;
          narrationContext = seat ? String(seat) : undefined;
        } else {
          narrationEvent = day === 1 ? NarrationEvent.MORNING : NarrationEvent.NO_DEATH;
        }
        break;
      }
      case 'day.lastWords':  narrationEvent = NarrationEvent.LAST_WORDS; break;
      case 'day.discussion': narrationEvent = NarrationEvent.DISCUSSION_BEGIN; break;
      case 'day.defense':    narrationEvent = NarrationEvent.DEFENSE_BEGIN; break;
      case 'day.finalVote':  narrationEvent = NarrationEvent.VOTE_BEGIN; break;
    }

    let extra: Partial<GameState> = { phaseStartedAt: now, speakerId, narrationEvent, narrationContext, voteResults: undefined };

    switch (phase) {
      case 'night.seating':
      case 'night.roleReveal':
        extra = { ...extra, readyPlayers: [] };
        break;
      case 'night.sheriffCheck':
      case 'night.donCheck': {
        // Random minimum duration between 40-60s so villagers can't infer timing
        const minDuration = NIGHT_INVESTIGATION_MIN_MS + Math.random() * (NIGHT_INVESTIGATION_MAX_MS - NIGHT_INVESTIGATION_MIN_MS);
        extra = { ...extra, investigationMinEndAt: now + minDuration, investigationContinueAt: undefined };
        break;
      }
      case 'night.mafiaKill':
        // phaseStartedAt used for number-calling cadence
        break;
      case 'day.lastWords':
        extra = { ...extra, lastWordsNextPhase: 'day.discussion' as const };
        break;
      case 'day.discussion': {
        const firstSpeakerSeat = gameState.firstSpeakerSeat ?? (getAliveSeats(inGamePlayers)[0] ?? 1);
        const speakerQueue = buildSpeakerQueue(firstSpeakerSeat, inGamePlayers);
        extra = {
          ...extra,
          firstSpeakerSeat,
          speakerQueue,
          speakerStartedAt: now + SPEAKER_NARRATION_BUFFER_MS,
          accusations: {},
        };
        // Clear stale votes from previous day
        set((state) => ({
          clients: state.clients.map((c) => ({
            ...c,
            playerData: { ...c.playerData, myVote: undefined },
          })),
        }));
        set({ finalVoteChoices: {} });
        break;
      }
      case 'day.defense':
        extra = { ...extra, defenseIndex: 0, speakerStartedAt: now + SPEAKER_NARRATION_BUFFER_MS };
        break;
      case 'day.finalVote':
        extra = { ...extra, readyPlayers: [], voteCount: 0 };
        set({ finalVoteChoices: {} });
        // Reset each player's vote from prior days
        set((state) => ({
          clients: state.clients.map((c) => ({
            ...c,
            playerData: { ...c.playerData, myVote: undefined },
          })),
        }));
        break;
    }

    set({ gameState: { ...gameState, ...extra, phase, day } });

    // Per-phase player-data resets (done via direct set to avoid multiple updateClientsState calls)
    if (phase === 'night.mafiaKill') {
      // Clear kill votes from the previous night
      set({ nightKillVotes: {} });
      set((state) => ({
        clients: state.clients.map((c) =>
          isMafiaRole(c.playerData.role)
            ? { ...c, playerData: { ...c.playerData, myKillVote: undefined } }
            : c
        ),
      }));
    } else if (phase === 'night.sheriffCheck') {
      const sheriff = clients.find((c) => c.playerData.role === 'sheriff');
      if (sheriff) {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.playerData.id === sheriff.playerData.id
              ? { ...c, playerData: { ...c.playerData, lastInvestigationResult: undefined } }
              : c
          ),
        }));
      }
    } else if (phase === 'night.donCheck') {
      const don = clients.find((c) => c.playerData.role === 'don');
      if (don) {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.playerData.id === don.playerData.id
              ? { ...c, playerData: { ...c.playerData, lastInvestigationResult: undefined } }
              : c
          ),
        }));
      }
    }

    get().updateClientsState(); // always broadcast once at the end
  },

  advanceSpeaker: () => {
    if (_advancingSpeaker) return;
    _advancingSpeaker = true;
    try {
    const { gameState, clients } = get();
    const inGamePlayers = clients
      .filter((c) => c.playerData.status === StatusSchema.enum.inGame)
      .map((c) => c.playerData);
    const speakerId = pickSpeaker(clients);
    const now = Date.now();

    if (gameState.phase === 'day.discussion') {
      const queue = [...(gameState.speakerQueue ?? [])];
      queue.shift();

      if (queue.length === 0) {
        // Round complete — build accused list from finalized accusations
        const accusedList = getAccusedList(gameState);
        if (accusedList.length === 0) {
          const nextFirst = gameState.firstSpeakerSeat
            ? getNextFirstSpeaker(gameState.firstSpeakerSeat, inGamePlayers)
            : (getAliveSeats(inGamePlayers)[0] ?? 1);
          set({
            gameState: {
              ...gameState,
              phase: 'night.mafiaKill',
              day: gameState.day + 1,
              speakerQueue: undefined,
              speakerStartedAt: undefined,
              accusations: undefined,
              firstSpeakerSeat: nextFirst,
              phaseStartedAt: now,
              speakerId,
              narrationEvent: NarrationEvent.MAFIA_KILL_BEGIN,
              narrationContext: undefined,
            },
          });
        } else if (accusedList.length === 1) {
          // Unanimous: every accusation pointed at the same player → instant elimination,
          // skip defense and vote. Accused gets 30 s of last words then night resumes.
          const targetId = accusedList[0];
          const targetClient = clients.find((c) => c.playerData.id === targetId);
          const nextFirst = gameState.firstSpeakerSeat
            ? getNextFirstSpeaker(gameState.firstSpeakerSeat, inGamePlayers)
            : (getAliveSeats(inGamePlayers)[0] ?? 1);
          get()._eliminatePlayer(targetId);
          const winner = checkWinCondition(get().clients.map((c) => c.playerData));
          if (winner) {
            set({
              gameState: {
                ...gameState,
                phase: 'ended',
                winner,
                speakerQueue: undefined,
                speakerStartedAt: undefined,
                speakerId,
                narrationEvent: winner === 'mafia' ? NarrationEvent.MAFIA_WINS : NarrationEvent.CIVILIANS_WIN,
                narrationContext: undefined,
              },
            });
          } else {
            set({
              gameState: {
                ...gameState,
                phase: 'day.lastWords',
                accusations: undefined,
                speakerQueue: undefined,
                defenseIndex: undefined,
                speakerStartedAt: undefined,
                readyPlayers: undefined,
                voteOpenAt: undefined,
                voteCount: undefined,
                firstSpeakerSeat: nextFirst,
                lastEliminated: targetId,
                lastWordsNextPhase: 'night.mafiaKill' as const,
                phaseStartedAt: now,
                speakerId,
                narrationEvent: NarrationEvent.VOTE_ELIMINATED,
                narrationContext: targetClient?.playerData.index
                  ? String(targetClient.playerData.index)
                  : undefined,
              },
            });
          }
        } else {
          set({
            gameState: {
              ...gameState,
              phase: 'day.defense',
              speakerQueue: undefined,
              defenseIndex: 0,
              speakerStartedAt: now + SPEAKER_NARRATION_BUFFER_MS,
              phaseStartedAt: now,
              speakerId,
              narrationEvent: NarrationEvent.DEFENSE_BEGIN,
              narrationContext: undefined,
            },
          });
        }
      } else {
        const nextSeat = queue[0];
        // Voice comes from the speaker's own phone
        const nextSpeakerClient = clients.find(
          (c) => c.playerData.index === nextSeat && c.playerData.status === StatusSchema.enum.inGame
        );
        const nextSpeakerId = nextSpeakerClient?.playerData.id ?? speakerId;
        set({
          gameState: {
            ...gameState,
            speakerQueue: queue,
            speakerStartedAt: now + SPEAKER_NARRATION_BUFFER_MS,
            speakerId: nextSpeakerId,
            narrationEvent: NarrationEvent.SPEAKER_TURN,
            narrationContext: String(nextSeat),
          },
        });
      }
      get().updateClientsState();
      return;
    }

    if (gameState.phase === 'day.defense') {
      const nextIndex = (gameState.defenseIndex ?? 0) + 1;
      const accusedList = getAccusedList(gameState);

      if (nextIndex >= accusedList.length) {
        set({
          gameState: {
            ...gameState,
            phase: 'day.finalVote',
            defenseIndex: undefined,
            speakerStartedAt: undefined,
            readyPlayers: [],
            voteCount: 0,
            phaseStartedAt: now,
            speakerId,
            narrationEvent: NarrationEvent.VOTE_BEGIN,
            narrationContext: undefined,
          },
        });
        set({ finalVoteChoices: {} });
      } else {
        const defenderId = accusedList[nextIndex];
        const defenderClient = clients.find((c) => c.playerData.id === defenderId);
        const defenderSeat = defenderClient?.playerData.index;
        set({
          gameState: {
            ...gameState,
            defenseIndex: nextIndex,
            speakerStartedAt: now + SPEAKER_NARRATION_BUFFER_MS,
            speakerId: defenderId ?? speakerId,
            narrationEvent: NarrationEvent.DEFENDER_TURN,
            narrationContext: defenderSeat ? String(defenderSeat) : undefined,
          },
        });
      }
      get().updateClientsState();
    }
    } finally { _advancingSpeaker = false; }
  },

  endGame: () => {
    set((state) => ({ gameState: { ...state.gameState, phase: 'ended' } }));
    get().updateClientsState();
  },

  pauseGame: (disconnectedPlayerId) => {
    const { clients } = get();
    const seat = clients.find((c) => c.playerData.id === disconnectedPlayerId)?.playerData.index;
    const speakerId = pickSpeaker(clients);
    set((state) => ({
      gameState: {
        ...state.gameState,
        pausedBy: disconnectedPlayerId,
        disconnectVotes: {},
        speakerId,
        narrationEvent: NarrationEvent.PLAYER_DISCONNECTED,
        narrationContext: seat ? String(seat) : undefined,
      },
    }));
    get().updateClientsState();
  },

  unpauseGame: () => {
    const { clients, gameState } = get();
    const reconnectedId = gameState.pausedBy;
    const seat = reconnectedId
      ? clients.find((c) => c.playerData.id === reconnectedId)?.playerData.index
      : undefined;
    const speakerId = pickSpeaker(clients);
    set((state) => {
      const { pausedBy: _, disconnectVotes: __, ...rest } = state.gameState;
      return {
        gameState: {
          ...rest,
          speakerId,
          narrationEvent: NarrationEvent.PLAYER_RECONNECTED,
          narrationContext: seat ? String(seat) : undefined,
        },
      };
    });
    get().updateClientsState();
  },

  eliminateDisconnectedPlayer: (playerId) => {
    const { clients } = get();
    const seat = clients.find((c) => c.playerData.id === playerId)?.playerData.index;
    const speakerId = pickSpeaker(clients);
    get().updateClientPlayerData(playerId, { status: StatusSchema.enum.eliminated });
    set((state) => {
      const { pausedBy: _, disconnectVotes: __, ...rest } = state.gameState;
      return {
        gameState: {
          ...rest,
          speakerId,
          narrationEvent: NarrationEvent.PLAYER_ELIMINATED_DISCONNECT,
          narrationContext: seat ? String(seat) : undefined,
        },
      };
    });
    get().updateClientsState();
  },

  _eliminatePlayer: (playerId) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.playerData.id === playerId
          ? { ...c, playerData: { ...c.playerData, status: StatusSchema.enum.eliminated } }
          : c
      ),
    }));
  },

  _processNightKill: () => {
    const { gameState, nightKillVotes, clients } = get();
    const targetId = tallyKillVotes(nightKillVotes);
    set({ nightKillVotes: {} });

    if (targetId) {
      // Check win condition as if the player were already eliminated.
      // We defer the actual status change to day.start so the player appears
      // alive during the rest of the night (sheriff/don phases).
      const hypotheticalPlayers = clients.map((c) =>
        c.playerData.id === targetId
          ? { ...c.playerData, status: StatusSchema.enum.eliminated }
          : c.playerData
      );
      const winner = checkWinCondition(hypotheticalPlayers);
      if (winner) {
        // Eliminate immediately for the game-over screen
        get()._eliminatePlayer(targetId);
        const speakerId = pickSpeaker(clients);
        set({
          gameState: {
            ...gameState,
            phase: 'ended',
            winner,
            lastEliminated: targetId,
            speakerId,
            narrationEvent: winner === 'mafia' ? NarrationEvent.MAFIA_WINS : NarrationEvent.CIVILIANS_WIN,
            narrationContext: undefined,
          },
        });
        get().updateClientsState();
        return;
      }
      // No winner: player stays inGame during the night phases.
      // _enterPhase('day.start') will call _eliminatePlayer when morning arrives.
    }

    const speakerId = pickSpeaker(clients);
    const next = getNextPhase('night.mafiaKill', gameState.day);
    const now = Date.now();
    const minDuration = NIGHT_INVESTIGATION_MIN_MS + Math.random() * (NIGHT_INVESTIGATION_MAX_MS - NIGHT_INVESTIGATION_MIN_MS);
    set({
      gameState: {
        ...gameState,
        phase: next.phase,
        day: next.day,
        lastEliminated: targetId ?? undefined,
        phaseStartedAt: now,
        speakerId,
        narrationEvent: NarrationEvent.SHERIFF_WAKE,
        narrationContext: undefined,
        investigationMinEndAt: now + minDuration,
        investigationContinueAt: undefined,
      },
    });
    // Reset sheriff's lastInvestigationResult for this new night (night 2+ bypasses _enterPhase)
    const sheriffClient = get().clients.find((c) => c.playerData.role === 'sheriff');
    if (sheriffClient) {
      set((state) => ({
        clients: state.clients.map((c) =>
          c.playerData.id === sheriffClient.playerData.id
            ? { ...c, playerData: { ...c.playerData, lastInvestigationResult: undefined } }
            : c
        ),
      }));
    }
    get().updateClientsState();
  },

  _processFinalVote: () => {
    const { gameState, finalVoteChoices, clients } = get();
    const inGameIds = clients
      .filter((c) => c.playerData.status === StatusSchema.enum.inGame)
      .map((c) => c.playerData.id);
    const accusedList = getAccusedList(gameState);
    const lastAccused = accusedList.at(-1);

    // Auto-cast missing votes to the last accused player
    const completedVotes = { ...finalVoteChoices };
    if (lastAccused) {
      for (const id of inGameIds) {
        if (!completedVotes[id]) completedVotes[id] = lastAccused;
      }
    }

    // Build vote results for display (voterSeat → targetSeat)
    const voteResults = Object.entries(completedVotes)
      .map(([voterId, targetId]) => {
        const voter = clients.find((c) => c.playerData.id === voterId);
        const target = clients.find((c) => c.playerData.id === targetId);
        return voter?.playerData.index != null && target?.playerData.index != null
          ? { voterSeat: voter.playerData.index, targetSeat: target.playerData.index }
          : null;
      })
      .filter((v): v is { voterSeat: number; targetSeat: number } => v !== null)
      .sort((a, b) => a.voterSeat - b.voterSeat);

    const tally = tallyVotes(completedVotes);
    const toEliminate = tally.isTie ? tally.tiedIds : tally.winnerId ? [tally.winnerId] : [];
    for (const id of toEliminate) get()._eliminatePlayer(id);

    const winner = checkWinCondition(get().clients.map((c) => c.playerData));
    if (winner) {
      const speakerId = pickSpeaker(get().clients);
      set({
        finalVoteChoices: {},
        gameState: {
          ...gameState,
          phase: 'ended',
          winner,
          speakerId,
          narrationEvent: winner === 'mafia' ? NarrationEvent.MAFIA_WINS : NarrationEvent.CIVILIANS_WIN,
          narrationContext: undefined,
        },
      });
      get().updateClientsState();
      return;
    }

    // Determine narration for vote result
    const tiedIds = tally.isTie ? tally.tiedIds : [];
    const eliminatedSeat = toEliminate.length === 1
      ? get().clients.find((c) => c.playerData.id === toEliminate[0])?.playerData.index
      : undefined;

    const inGamePlayers = get()
      .clients.filter((c) => c.playerData.status === StatusSchema.enum.inGame)
      .map((c) => c.playerData);
    const nextFirst = gameState.firstSpeakerSeat
      ? getNextFirstSpeaker(gameState.firstSpeakerSeat, inGamePlayers)
      : (getAliveSeats(inGamePlayers)[0] ?? 1);
    const speakerId = pickSpeaker(get().clients);

    if (toEliminate.length > 0) {
      set({
        finalVoteChoices: {},
        gameState: {
          ...gameState,
          phase: 'day.lastWords',
          accusations: undefined,
          defenseIndex: undefined,
          speakerStartedAt: undefined,
          readyPlayers: undefined,
          voteOpenAt: undefined,
          voteCount: undefined,
          firstSpeakerSeat: nextFirst,
          lastEliminated: toEliminate[0],
          lastWordsNextPhase: 'night.mafiaKill',
          phaseStartedAt: Date.now(),
          speakerId,
          voteResults,
          narrationEvent: tiedIds.length > 0 ? NarrationEvent.VOTE_TIE : NarrationEvent.VOTE_ELIMINATED,
          narrationContext: eliminatedSeat ? String(eliminatedSeat) : undefined,
        },
      });
    } else {
      // Tie with no eliminations — go directly to night
      set({
        finalVoteChoices: {},
        nightKillVotes: {},
        gameState: {
          ...gameState,
          phase: 'night.mafiaKill',
          day: gameState.day + 1,
          accusations: undefined,
          defenseIndex: undefined,
          speakerStartedAt: undefined,
          readyPlayers: undefined,
          voteOpenAt: undefined,
          voteCount: undefined,
          firstSpeakerSeat: nextFirst,
          phaseStartedAt: Date.now(),
          speakerId,
          narrationEvent: NarrationEvent.VOTE_TIE,
          narrationContext: undefined,
        },
      });
      set((state) => ({
        clients: state.clients.map((c) =>
          isMafiaRole(c.playerData.role)
            ? { ...c, playerData: { ...c.playerData, myKillVote: undefined } }
            : c
        ),
      }));
    }
    get().updateClientsState();
  },

  handleClientAction: (clientId, rawAction) => {
    const result = MafiaActionSchema.safeParse(rawAction);
    if (!result.success) return;
    const action = result.data;
    const { gameState, clients } = get();
    const client = get().getClientById(clientId);
    if (!client) return;

    switch (action.type) {
      case 'ready': {
        const readyPlayers = [...(gameState.readyPlayers ?? [])];
        if (!readyPlayers.includes(clientId)) readyPlayers.push(clientId);

        const inGameIds = clients
          .filter((c) => c.playerData.status === StatusSchema.enum.inGame)
          .map((c) => c.playerData.id);
        const allReady = inGameIds.every((id) => readyPlayers.includes(id));

        if (gameState.phase === 'night.seating') {
          if (allReady) {
            get()._enterPhase('night.roleReveal', gameState.day);
          } else {
            set({ gameState: { ...gameState, readyPlayers } });
            get().updateClientsState();
          }
        } else if (gameState.phase === 'night.roleReveal') {
          if (allReady) {
            get()._enterPhase('night.mafiaSetup', gameState.day);
          } else {
            set({ gameState: { ...gameState, readyPlayers } });
            get().updateClientsState();
          }
        } else if (gameState.phase === 'night.mafiaSetup') {
          const mafiaSetupDone = [...get().mafiaSetupDone];
          if (!mafiaSetupDone.includes(clientId)) mafiaSetupDone.push(clientId);
          set({ mafiaSetupDone });

          const aliveMafia = clients.filter(
            (c) =>
              c.playerData.status === StatusSchema.enum.inGame && isMafiaRole(c.playerData.role)
          );
          if (aliveMafia.every((m) => mafiaSetupDone.includes(m.playerData.id))) {
            set({ mafiaSetupDone: [] });
            get()._enterPhase('night.sheriffCheck', gameState.day);
          }
        } else if (gameState.phase === 'day.finalVote') {
          if (allReady) {
            set({
              gameState: {
                ...gameState,
                readyPlayers,
                voteOpenAt: Date.now(), // open immediately
              },
            });
          } else {
            set({ gameState: { ...gameState, readyPlayers } });
          }
          get().updateClientsState();
        }
        break;
      }

      case 'kill': {
        if (gameState.phase !== 'night.mafiaKill') break;
        if (!isMafiaRole(client.playerData.role)) break;
        if (client.playerData.myKillVote) break;

        const newVotes = { ...get().nightKillVotes, [clientId]: action.targetId };
        set({ nightKillVotes: newVotes });
        get().updateClientPlayerData(clientId, { myKillVote: action.targetId });
        // Do NOT tally early — the full number countdown must finish first.
        // game.tsx fires _processNightKill() when the timer expires.
        break;
      }

      case 'investigate': {
        const { phase } = gameState;
        if (phase !== 'night.sheriffCheck' && phase !== 'night.donCheck') break;
        if (phase === 'night.sheriffCheck' && client.playerData.role !== 'sheriff') break;
        if (phase === 'night.donCheck' && client.playerData.role !== 'don') break;

        const target = clients.find((c) => c.playerData.id === action.targetId);
        if (!target || target.playerData.status !== StatusSchema.enum.inGame) break;

        const targetRole = target.playerData.role;
        const investigationResult =
          phase === 'night.sheriffCheck'
            ? isMafiaRole(targetRole) ? ('mafia' as const) : ('village' as const)
            : targetRole === 'sheriff' ? ('sheriff' as const) : ('not-sheriff' as const);

        const history = [...(client.playerData.investigationHistory ?? []), action.targetId];
        get().updateClientPlayerData(clientId, {
          investigationHistory: history,
          lastInvestigationResult: investigationResult,
        });
        break;
      }

      case 'continue': {
        const { phase } = gameState;
        if (
          (phase === 'night.sheriffCheck' && client.playerData.role === 'sheriff') ||
          (phase === 'night.donCheck' && client.playerData.role === 'don')
        ) {
          // Record that the role pressed Continue; the host timer enforces the minimum duration
          get().setGameState({ ...gameState, investigationContinueAt: Date.now() });
          get().updateClientsState();
        }
        break;
      }

      case 'accuse': {
        if (gameState.phase !== 'day.discussion') break;
        // Only the current speaker can accuse
        const currentSeat = gameState.speakerQueue?.[0];
        if (currentSeat !== client.playerData.index) break;
        // Can't accuse yourself or a dead player
        const targetClient = clients.find((c) => c.playerData.id === action.targetId);
        if (!targetClient || targetClient.playerData.status !== StatusSchema.enum.inGame) break;
        if (action.targetId === clientId) break;

        // Check if this target was already accused by a DIFFERENT (finished) speaker
        const myPreviousAccusation = gameState.accusations?.[clientId];
        const otherAccusations = Object.entries(gameState.accusations ?? {})
          .filter(([speakerId]) => speakerId !== clientId)
          .map(([, tid]) => tid);

        if (otherAccusations.includes(action.targetId)) break; // taken by another speaker

        // If changing accusation, the old entry is simply overwritten
        void myPreviousAccusation;

        const newAccusations = { ...(gameState.accusations ?? {}), [clientId]: action.targetId };
        set({ gameState: { ...gameState, accusations: newAccusations } });
        get().updateClientsState();
        break;
      }

      case 'finishSpeaking': {
        const { phase } = gameState;

        if (phase === 'day.lastWords') {
          if (clientId !== gameState.lastEliminated) break;
          const next = gameState.lastWordsNextPhase ?? 'day.discussion';
          const nextDay = next === 'night.mafiaKill' ? gameState.day + 1 : gameState.day;
          get()._enterPhase(next, nextDay);
          break;
        }

        if (phase !== 'day.discussion' && phase !== 'day.defense') break;
        if (phase === 'day.discussion') {
          if (gameState.speakerQueue?.[0] !== client.playerData.index) break;
        }
        if (phase === 'day.defense') {
          const defIdx = gameState.defenseIndex ?? 0;
          if (getAccusedList(gameState)[defIdx] !== clientId) break;
        }
        get().advanceSpeaker();
        break;
      }

      case 'vote': {
        if (gameState.phase !== 'day.finalVote') break;
        if (!gameState.voteOpenAt || Date.now() < gameState.voteOpenAt) break;
        if (!getAccusedList(gameState).includes(action.targetId)) break;
        if (get().finalVoteChoices[clientId]) break;

        const choices = { ...get().finalVoteChoices, [clientId]: action.targetId };
        set({ finalVoteChoices: choices });

        const voteCount = Object.keys(choices).length;
        get().updateClientPlayerData(clientId, { myVote: action.targetId });

        const inGameIds = clients
          .filter((c) => c.playerData.status === StatusSchema.enum.inGame)
          .map((c) => c.playerData.id);

        if (inGameIds.every((id) => choices[id])) {
          get()._processFinalVote();
        } else {
          set({ gameState: { ...gameState, voteCount } });
          get().updateClientsState();
        }
        break;
      }

      case 'disconnectVote': {
        if (!gameState.pausedBy) break;
        // Only alive (inGame) players can vote
        if (client.playerData.status !== StatusSchema.enum.inGame) break;

        const newVotes = { ...(gameState.disconnectVotes ?? {}), [clientId]: action.vote };
        const eliminateCount = Object.values(newVotes).filter((v) => v === 'eliminate').length;
        const inGameCount = clients.filter(
          (c) => c.playerData.status === StatusSchema.enum.inGame
        ).length;
        const threshold = Math.ceil(inGameCount * 0.75);

        if (eliminateCount >= threshold) {
          get().eliminateDisconnectedPlayer(gameState.pausedBy);
        } else {
          set({ gameState: { ...gameState, disconnectVotes: newVotes } });
          get().updateClientsState();
        }
        break;
      }
    }
  },

  clearStore: () => {
    const { host } = get();
    if (host?.peer) destroyPeer(host.peer);
    set({
      gameState: INITIAL_GAME_STATE,
      clients: [],
      host: undefined,
      backupHostId: undefined,
      nightKillVotes: {},
      finalVoteChoices: {},
      mafiaSetupDone: [],
    });
  },

  updateClientsState: () => {
    const { host, clients, gameState, backupHostId } = get();
    if (!host) return;
    const isEnded = gameState.phase === 'ended';
    for (const client of clients) {
      if (client.connection?.open) {
        const state: MafiaClientState = {
          playerData: client.playerData,
          playersList: clients.map((c) => ({
            id: c.playerData.id,
            name: c.playerData.name,
            index: c.playerData.index,
            status: c.playerData.status,
            // Reveal roles to everyone once the game ends
            role: isEnded ? c.playerData.role : undefined,
          })),
          gameState,
          backupHostId,
        };
        sendToClient(client.connection, state);
      }
    }

    // Debounced backup snapshot — only send when the phase changes to avoid
    // flooding the WebRTC data channel on every minor state update.
    if (backupHostId && gameState.phase !== 'waiting') {
      if (gameState.phase !== _lastSnapshotPhase) {
        _lastSnapshotPhase = gameState.phase;
        const backupClient = clients.find((c) => c.playerData.id === backupHostId);
        if (backupClient?.connection?.open) {
          const snapshot: HostSnapshot = {
            players: clients.map((c) => c.playerData),
            gameState,
            backupHostId,
          };
          sendRawToClient(backupClient.connection, snapshot);
        }
      }
    }
  },
}));

export { MIN_PLAYERS, getAlivePlayers };
