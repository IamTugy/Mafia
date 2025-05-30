import { useState } from 'react';
import type Peer from 'peerjs';
import { createPeer, connectToPeer, setupHost, cleanupPeer } from '@/lib/peerjs-handler';
import { usePeerStore } from '@/lib/store/peer-store';

interface UsePeerReturn {
  peer: Peer | null;
  hostId: string | null;
  isInGame: boolean;
  isCreating: boolean;
  isJoining: boolean;
  createGame: (playerName: string) => Promise<void>;
  joinGame: (gameId: string, playerName: string) => Promise<void>;
  leaveGame: () => void;
}

export function usePeer(): UsePeerReturn {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [isInGame, setIsInGame] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { setHost } = usePeerStore();

  const createGame = async (playerName: string) => {
    if (!playerName || isCreating) return;
    
    setIsCreating(true);
    try {
      console.log('Creating new game...');
      const { peer: newPeer, id } = await createPeer();
      console.log('Peer created with ID:', id);
      
      setPeer(newPeer);
      setHostId(id);
      setHost(true);
      setupHost(newPeer);
      setIsInGame(true);
    } catch (error) {
      console.error('Failed to create game:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const joinGame = async (gameId: string, playerName: string) => {
    if (!gameId || !playerName || isJoining) return;
    
    setIsJoining(true);
    try {
      console.log('Joining game with ID:', gameId);
      const { peer: newPeer } = await createPeer();
      console.log('Peer created, connecting to host:', gameId);
      
      setPeer(newPeer);
      setHostId(gameId);
      setHost(false);
      connectToPeer(newPeer, gameId, playerName);
      setIsInGame(true);
    } catch (error) {
      console.error('Failed to join game:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const leaveGame = () => {
    if (peer) {
      cleanupPeer(peer);
    }
    setPeer(null);
    setHostId(null);
    setHost(false);
    setIsInGame(false);
    setIsCreating(false);
    setIsJoining(false);
  };

  return {
    peer,
    hostId,
    isInGame,
    isCreating,
    isJoining,
    createGame,
    joinGame,
    leaveGame,
  };
} 