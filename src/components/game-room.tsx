import { usePeerStore } from '@/lib/store/peer-store';
import { usePeer } from '@/lib/hooks/use-peer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';

interface GameRoomProps {
  onLeave: () => void;
  hostId: string;
}

export function GameRoom({ onLeave, hostId }: GameRoomProps) {
  const {
    connectedPeers,
    waitingPeers,
    gameState: { maxPlayers, isGameStarted },
    isHost,
  } = usePeerStore();

  const { broadcastGameState, movePlayerToGame, movePlayerToWaiting, isWaiting } = usePeer();

  const handleStartGame = () => {
    if (isHost()) {
      broadcastGameState({ isGameStarted: true });
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(hostId);
  };

  return (
    <div className="flex size-full items-center justify-center overflow-hidden bg-[url('/src/assets/game-lobby-background.png')] bg-cover bg-center p-4">
      <Card className="max-h-3/4 w-full max-w-4xl overflow-scroll border-gray-700 bg-gray-800/10 shadow-xl backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex-1 text-2xl font-bold text-white">
              {isHost() ? 'Game Room (Host)' : isWaiting ? 'Waiting List' : 'Waiting for Host'}
            </CardTitle>
            <Button onClick={onLeave} variant="semiTransparent" size="lg" className="w-42">
              Leave Game
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isHost() && (
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
                        disabled={connectedPeers.length < maxPlayers || isGameStarted}
                        className={cn(
                          'w-42 bg-red-600 hover:bg-red-700',
                          connectedPeers.length < maxPlayers && 'cursor-not-allowed opacity-50'
                        )}
                        size="lg"
                      >
                        {connectedPeers.length < maxPlayers ? 'Waiting for Players' : 'Start Game'}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-400">
                      {connectedPeers.length} / {maxPlayers} Players Connected
                      {waitingPeers.length > 0 && ` (${waitingPeers.length} in waiting list)`}
                    </p>
                  </div>
                </div>
                <Progress
                  value={(connectedPeers.length / maxPlayers) * 100}
                  className="mt-2 h-2 bg-gray-700 [&>div]:bg-red-600"
                />
              </div>
            </>
          )}

          {!isHost() && (
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
                    {connectedPeers.length} / {maxPlayers} Players Connected
                    {waitingPeers.length > 0 && ` (${waitingPeers.length} in waiting list)`}
                  </p>
                </div>
              </div>
              <Progress
                value={(connectedPeers.length / maxPlayers) * 100}
                className="mt-2 h-2 bg-gray-700 [&>div]:bg-red-600"
              />
              {isWaiting ? (
                <div className="mt-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                  <p className="text-sm text-yellow-400">
                    You are currently in the waiting list. The host will add you to the game when a
                    spot becomes available.
                  </p>
                </div>
              ) : connectedPeers.length === maxPlayers && !isGameStarted ? (
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
                    peer.id === usePeerStore.getState().currentPeer?.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-medium text-white">
                        {peer.name}
                        {peer.id === usePeerStore.getState().currentPeer?.id && (
                          <span className="ml-2 text-sm text-blue-400">(you)</span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">ID: {peer.id}</p>
                    </div>
                    {isHost() && !isGameStarted && (
                      <Button
                        variant="semiTransparent"
                        size="sm"
                        onClick={() => movePlayerToWaiting(peer.id)}
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
                      peer.id === usePeerStore.getState().currentPeer?.id
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : 'border-gray-700'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-lg font-medium text-white">
                          {peer.name}
                          {peer.id === usePeerStore.getState().currentPeer?.id && (
                            <span className="ml-2 text-sm text-yellow-400">(you)</span>
                          )}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">ID: {peer.id}</p>
                      </div>
                      {isHost() && !isGameStarted && connectedPeers.length < maxPlayers && (
                        <Button
                          variant="semiTransparent"
                          size="sm"
                          onClick={() => movePlayerToGame(peer.id)}
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
