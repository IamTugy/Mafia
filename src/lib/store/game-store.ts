import { create } from 'zustand';
import type { ConnectedPeer } from './peer-store';

export type Role = 'don' | 'mafia' | 'sheriff' | 'civilian';
export type GamePhase = 
  // Waiting stage
  | 'waiting'           // Waiting for players to join
  
  // Night stage
  | 'night.roleReveal'  // First night - players discover their roles
  | 'night.mafiaSetup'  // First night - mafia meet and don chooses targets
  | 'night.mafiaKill'   // Night - mafia choose who to kill
  | 'night.sheriffCheck'// Night - sheriff investigates
  | 'night.donCheck'    // Night - don investigates
  
  // Day stage
  | 'day.start'         // Day - announce night results
  | 'day.discussion'    // Day - players discuss and can accuse others during their turn
  | 'day.defense'       // Day - accused players defend
  | 'day.finalVote'     // Day - final vote
  
  // End stage
  | 'ended';            // Game ended

// Helper type to get the stage from a phase
export type GameStage = 'waiting' | 'night' | 'day' | 'ended';

interface Player extends ConnectedPeer {
  id: string;          // peer id
  name: string;        // peer name
  role: Role;
  number: number;      // Player's position in the circle (1-10)
  isAlive: boolean;
  isVoted: boolean;    // Whether player was voted in current round
  voteCount: number;   // Number of votes against player in current round
}

interface GameState {
  phase: GamePhase;
  day: number;
  players: Player[];
  currentSpeaker?: string;  // ID of player who is currently speaking
  speakingTimeLeft: number; // Time left for current speaker in seconds
  mafiaTargets: string[];   // IDs of players chosen by don for next 3 nights
  lastKilled?: string;      // ID of last killed player
  winner?: 'mafia' | 'civilians';
  accusedPlayers: string[]; // IDs of players who were accused during discussion
}

interface GameStore extends GameState {
  // Game setup
  initializeGame: (players: ConnectedPeer[]) => void;
  assignRoles: () => void;
  
  // Game flow
  startGame: () => void;
  nextPhase: () => void;
  endGame: (winner: 'mafia' | 'civilians') => void;
  
  // Player actions
  setMafiaTargets: (targets: string[]) => void;
  killPlayer: (playerId: string) => void;
  voteForPlayer: (voterId: string, targetId: string) => void;
  setCurrentSpeaker: (playerId: string, timeInSeconds: number) => void;
  updateSpeakingTime: (timeLeft: number) => void;
  accusePlayer: (accuserId: string, targetId: string) => void;
  resetAccusedPlayers: () => void;
  
  // Getters
  getAlivePlayers: () => Player[];
  getMafiaPlayers: () => Player[];
  getCivilianPlayers: () => Player[];
  getPlayerByNumber: (number: number) => Player | undefined;
  getPlayerById: (id: string) => Player | undefined;
  isGameOver: () => boolean;

  // Helper to get current stage
  getCurrentStage: () => GameStage;

  // Add new method to check game end conditions
  checkGameEnd: () => { isOver: boolean; winner?: 'mafia' | 'civilians' };
}

// Add a type for transition state
type TransitionState = {
  phase: GamePhase;
  day?: number;
};

const INITIAL_STATE: GameState = {
  phase: 'waiting',
  day: 0,
  players: [],
  speakingTimeLeft: 0,
  mafiaTargets: [],
  accusedPlayers: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL_STATE,

  // Helper to get current stage
  getCurrentStage: (): GameStage => {
    const phase = get().phase;
    if (phase === 'waiting') return 'waiting';
    if (phase === 'ended') return 'ended';
    if (phase.startsWith('night.')) return 'night';
    if (phase.startsWith('day.')) return 'day';
    return 'waiting'; // fallback
  },

  initializeGame: (players: ConnectedPeer[]) => {
    // Assign random numbers 1-10 to players
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const numberedPlayers = shuffledPlayers.map((player, index) => ({
      ...player,
      number: index + 1,
      role: 'civilian' as Role, // Temporary role, will be reassigned
      isAlive: true,
      isVoted: false,
      voteCount: 0,
    }));

    set({ players: numberedPlayers });
  },

  assignRoles: () => {
    const { players } = get();
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    // Assign roles
    const updatedPlayers = shuffledPlayers.map((player, index) => {
      let role: Role = 'civilian';
      if (index === 0) role = 'don';
      else if (index < 3) role = 'mafia';
      else if (index === 3) role = 'sheriff';
      
      return { ...player, role };
    });

    set({ players: updatedPlayers });
  },

  startGame: () => {
    set({ 
      phase: 'night.roleReveal',
      day: 1
    });
  },

  nextPhase: () => {
    const { phase, day } = get();
    
    // Check for game end conditions first
    const gameEndCheck = get().checkGameEnd();
    if (gameEndCheck.isOver && ['day.finalVote', 'day.start'].includes(phase)) {
      set({ phase: 'ended', winner: gameEndCheck.winner });
      return;
    }
    
    // Define phase transitions with proper typing
    const transitions: Record<GamePhase, TransitionState> = {
      // Waiting stage
      'waiting': { phase: 'night.roleReveal', day: 1 },
      
      // Night stage
      'night.roleReveal': { phase: 'night.mafiaSetup' },
      'night.mafiaSetup': { phase: 'day.start', day: 1 },
      'night.mafiaKill': { phase: 'night.sheriffCheck' },
      'night.sheriffCheck': { phase: 'night.donCheck' },
      'night.donCheck': { phase: 'day.start' },
      
      // Day stage
      'day.start': { phase: 'day.discussion' },
      'day.discussion': { phase: 'day.defense' },
      'day.defense': { phase: 'day.finalVote' },
      'day.finalVote': { phase: 'night.mafiaKill', day: day + 1 },
      
      // End stage
      'ended': { phase: 'ended' }
    };

    const nextState = transitions[phase];
    set(nextState);
  },

  endGame: (winner: 'mafia' | 'civilians') => {
    set({ 
      phase: 'ended',
      winner
    });
  },

  setMafiaTargets: (targets: string[]) => {
    set({ mafiaTargets: targets });
  },

  killPlayer: (playerId: string) => {
    set(state => ({
      players: state.players.map(player => 
        player.id === playerId ? { ...player, isAlive: false } : player
      ),
      lastKilled: playerId
    }));
  },

  voteForPlayer: (voterId: string, targetId: string) => {
    set(state => ({
      players: state.players.map(player => {
        if (player.id === targetId) {
          return { ...player, voteCount: player.voteCount + 1, isVoted: true };
        }
        return player;
      })
    }));
  },

  setCurrentSpeaker: (playerId: string, timeInSeconds: number) => {
    set({ 
      currentSpeaker: playerId,
      speakingTimeLeft: timeInSeconds
    });
  },

  updateSpeakingTime: (timeLeft: number) => {
    set({ speakingTimeLeft: timeLeft });
  },

  accusePlayer: (accuserId: string, targetId: string) => {
    set(state => ({
      accusedPlayers: [...state.accusedPlayers, targetId],
      players: state.players.map(player => {
        if (player.id === targetId) {
          return { ...player, isVoted: true };
        }
        return player;
      })
    }));
  },

  resetAccusedPlayers: () => {
    set(state => ({
      accusedPlayers: [],
      players: state.players.map(player => ({
        ...player,
        isVoted: false,
        voteCount: 0
      }))
    }));
  },

  // Getters
  getAlivePlayers: () => get().players.filter(p => p.isAlive),
  getMafiaPlayers: () => get().players.filter(p => p.isAlive && (p.role === 'mafia' || p.role === 'don')),
  getCivilianPlayers: () => get().players.filter(p => p.isAlive && (p.role === 'civilian' || p.role === 'sheriff')),
  getPlayerByNumber: (number: number) => get().players.find(p => p.number === number),
  getPlayerById: (id: string) => get().players.find(p => p.id === id),
  isGameOver: () => {
    const { players } = get();
    const aliveMafia = players.filter(p => p.isAlive && (p.role === 'mafia' || p.role === 'don')).length;
    const aliveCivilians = players.filter(p => p.isAlive && (p.role === 'civilian' || p.role === 'sheriff')).length;
    
    return aliveMafia === 0 || aliveMafia >= aliveCivilians;
  },

  checkGameEnd: () => {
    const { players } = get();
    const aliveMafia = players.filter(p => p.isAlive && (p.role === 'mafia' || p.role === 'don')).length;
    const aliveCivilians = players.filter(p => p.isAlive && (p.role === 'civilian' || p.role === 'sheriff')).length;
    
    if (aliveMafia === 0) {
      return { isOver: true, winner: 'civilians' };
    }
    if (aliveMafia >= aliveCivilians) {
      return { isOver: true, winner: 'mafia' };
    }
    return { isOver: false };
  },
})); 