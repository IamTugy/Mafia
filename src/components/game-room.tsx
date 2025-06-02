import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';
import { MAX_PLAYERS } from '@/lib/consts';
import { useServerStore } from '@/lib/store/server-store';
import { useClientStore } from '@/lib/store/client-store';
import { useServerPeer } from '@/lib/hooks/use-server-peer';

interface GameRoomProps {
  onLeave: () => void;
  hostId: string;
}

export function GameRoom({ onLeave, hostId }: GameRoomProps) {
  // Server store - for host
  const { 
    gameState, 
    host: serverHost 
  } = useServerStore();
  
  // Client store - for client data
  const { 
    playersList, 
    currentPlayerData, 
    gameState: clientGameState 
  } = useClientStore();
  
  // Server peer - for host actions
  const { 
    startGame, 
    moveClientToGame, 
    moveClientToWaiting 
  } = useServerPeer();

  // Determine if this is a host or client
  const isHost = serverHost.isActive;
  
  // Use appropriate data based on host/client role
  const phase = isHost ? gameState.phase : clientGameState.phase;
  
  // Filter players by status
  const connectedPeers = playersList.filter(p => p.status === 'inGame');
  const waitingPeers = playersList.filter(p => p.status === 'waiting');
  
  // Check if current player is waiting
  const isWaiting = currentPlayerData?.status === 'waiting';

  // Debug logging for component updates
  console.log('GameRoom render:', {
    connectedPeersCount: connectedPeers.length,
    phase,
    isHost: isHost
  });

  // Add debug logging for button state
  const isButtonDisabled = connectedPeers.length < MAX_PLAYERS || phase !== 'waiting';
  console.log('Button state:', {
    connectedPeersCount: connectedPeers.length,
    maxPlayers: MAX_PLAYERS,
    currentPhase: phase,
    isDisabled: isButtonDisabled,
    isHost: isHost
  });

  const handleStartGame = () => {
    if (!isHost) {
      console.warn('Non-host player attempted to start game');
      return;
    }

    if (connectedPeers.length < MAX_PLAYERS) {
      console.warn(`Cannot start game: need ${MAX_PLAYERS} players, but only ${connectedPeers.length} connected`);
      return;
    }

    if (phase !== 'waiting') {
      console.warn('Cannot start game: game is already in progress');
      return;
    }

    console.log('Host starting game...', {
      connectedPeersCount: connectedPeers.length,
      phase,
      isHost: isHost
    });
    
    try {
      // Start the game
      console.log('Starting game...');
      startGame();
      
      console.log('Game start sequence completed');
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(hostId);
  };

  const handleMovePlayerToWaiting = (playerId: string) => {
    if (!isHost) return;
    moveClientToWaiting(playerId);
  };

  const handleMovePlayerToGame = (playerId: string) => {
    if (!isHost) return;
    moveClientToGame(playerId);
  };

  return (
    <div className="flex size-full items-center justify-center overflow-hidden bg-[url('/src/assets/game-lobby-background.png')] bg-cover bg-center p-4">
      <Card className="max-h-3/4 w-full max-w-4xl overflow-scroll border-gray-700 bg-gray-800/10 shadow-xl backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex-1 text-2xl font-bold text-white">
              {isHost ? 'Game Room (Host)' : isWaiting ? 'Waiting List' : 'Waiting for Host'}
            </CardTitle>
            <Button onClick={onLeave} variant="semiTransparent" size="lg" className="w-42">
              Leave Game
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isHost && (
            <>
              <div className="rounded-lg border border-gray-700 bg-gray-800/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">Game Code</p>
                    <p className="mt-1 font-mono text-2xl tracking-wider text-white">{hostId}</p>
                  </div>
                  <Button variant="semiTransparent" onClick={handleCopyId} className="w-20">
                    Copy
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-400">
                  Share this code with other players to join the game
                </p>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-800/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex w-full flex-col">
                    <div className="flex w-full items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold text-gray-300">Host Controls</h3>
                      <Button
                        onClick={handleStartGame}
                        disabled={isButtonDisabled}
                        className={cn(
                          'w-42 bg-red-600 hover:bg-red-700',
                          isButtonDisabled && 'cursor-not-allowed opacity-50'
                        )}
                        size="lg"
                      >
                        {connectedPeers.length < MAX_PLAYERS 
                          ? `Waiting for Players (${connectedPeers.length}/${MAX_PLAYERS})` 
                          : 'Start Game'}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-400">
                      {connectedPeers.length} / {MAX_PLAYERS} Players Connected
                      {waitingPeers.length > 0 && ` (${waitingPeers.length} in waiting list)`}
                    </p>
                  </div>
                </div>
                <Progress
                  value={(connectedPeers.length / MAX_PLAYERS) * 100}
                  className="mt-2 h-2 bg-gray-700 [&>div]:bg-red-600"
                />
              </div>
            </>
          )}

          {!isHost && (
            <div className="rounded-lg border border-gray-700 bg-gray-800/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-300">
                    {isWaiting ? (
                      <span className="text-yellow-400">You are in the waiting list</span>
                    ) : (
                      'Waiting for Game'
                    )}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {connectedPeers.length} / {MAX_PLAYERS} Players Connected
                    {waitingPeers.length > 0 && ` (${waitingPeers.length} in waiting list)`}
                  </p>
                </div>
              </div>
              <Progress
                value={(connectedPeers.length / MAX_PLAYERS) * 100}
                className="mt-2 h-2 bg-gray-700 [&>div]:bg-red-600"
              />
              {isWaiting ? (
                <div className="mt-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                  <p className="text-sm text-yellow-400">
                    You are currently in the waiting list. The host will add you to the game when a
                    spot becomes available.
                  </p>
                </div>
              ) : connectedPeers.length === MAX_PLAYERS && phase === 'night.roleReveal' ? (
                <p className="mt-2 text-sm text-gray-400">Waiting for host to start the game...</p>
              ) : null}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Active Players ({connectedPeers.length})
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connectedPeers.map((peer) => (
                <div
                  key={peer.id}
                  className={cn(
                    'rounded-lg border bg-gray-800/20 p-4',
                    peer.id === currentPlayerData?.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-medium text-white">
                        {peer.name}
                        {peer.id === currentPlayerData?.id && (
                          <span className="ml-2 text-sm text-blue-400">(you)</span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">ID: {peer.id}</p>
                    </div>
                    {isHost && phase === 'waiting' && (
                      <Button
                        variant="semiTransparent"
                        size="sm"
                        onClick={() => handleMovePlayerToWaiting(peer.id)}
                        className="w-32 text-xs"
                      >
                        Move to Waiting
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {waitingPeers.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Waiting List ({waitingPeers.length})
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {waitingPeers.map((peer) => (
                  <div
                    key={peer.id}
                    className={cn(
                      'rounded-lg border bg-gray-800/20 p-4',
                      peer.id === currentPlayerData?.id
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : 'border-gray-700'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-lg font-medium text-white">
                          {peer.name}
                          {peer.id === currentPlayerData?.id && (
                            <span className="ml-2 text-sm text-yellow-400">(you)</span>
                          )}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">ID: {peer.id}</p>
                      </div>
                      {isHost && phase === 'waiting' && connectedPeers.length < MAX_PLAYERS && (
                        <Button
                          variant="semiTransparent"
                          size="sm"
                          onClick={() => handleMovePlayerToGame(peer.id)}
                          className="w-32 text-xs"
                        >
                          Add to Game
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
