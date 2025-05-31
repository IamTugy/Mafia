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

  const { 
    broadcastGameState, 
    movePlayerToGame, 
    movePlayerToWaiting,
    isWaiting 
  } = usePeer();

  const handleStartGame = () => {
    if (isHost()) {
      broadcastGameState({ isGameStarted: true });
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(hostId);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4 bg-cover bg-center overflow-hidden bg-[url('/src/assets/game-lobby-background.png')]">
      <Card className="w-full max-w-4xl bg-gray-800/10 border-gray-700 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl flex-1 font-bold text-white">
              {isHost() ? 'Game Room (Host)' : (isWaiting ? 'Waiting List' : 'Waiting for Host')}
            </CardTitle>
            <Button 
              onClick={onLeave}
              variant="semiTransparent"
              size="lg"
              className="w-60"
            >
              Leave Game
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isHost() && (
            <>
              <div className="bg-gray-800/20 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">Game Code</p>
                    <p className="text-2xl font-mono tracking-wider text-white mt-1">{hostId}</p>
                  </div>
                  <Button
                    variant="semiTransparent"
                    onClick={handleCopyId}
                    className="w-20"
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Share this code with other players to join the game
                </p>
              </div>

              <div className="bg-gray-800/20 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg text-gray-300 font-semibold">Host Controls</h3>
                    <p className="text-sm text-gray-400">
                      {connectedPeers.length} / {maxPlayers} Players Connected
                      {waitingPeers.length > 0 && ` (${waitingPeers.length} in waiting list)`}
                    </p>
                  </div>
                  <Button
                    onClick={handleStartGame}
                    disabled={connectedPeers.length < maxPlayers || isGameStarted}
                    className={cn(
                      "bg-red-600 hover:bg-red-700",
                      connectedPeers.length < maxPlayers && "opacity-50 cursor-not-allowed"
                    )}
                    size="lg"
                  >
                    {connectedPeers.length < maxPlayers ? "Waiting for Players" : "Start Game"}
                  </Button>
                </div>
                <Progress 
                  value={(connectedPeers.length / maxPlayers) * 100} 
                  className="h-2 bg-gray-700 [&>div]:bg-red-600 mt-2" 
                />
              </div>
            </>
          )}

          {!isHost() && (
            <div className="bg-gray-800/20 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg text-gray-300 font-semibold">
                    {isWaiting ? (
                      <span className="text-yellow-400">You are in the waiting list</span>
                    ) : 'Waiting for Game'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {connectedPeers.length} / {maxPlayers} Players Connected
                    {waitingPeers.length > 0 && ` (${waitingPeers.length} in waiting list)`}
                  </p>
                </div>
              </div>
              <Progress 
                value={(connectedPeers.length / maxPlayers) * 100} 
                className="h-2 bg-gray-700 [&>div]:bg-red-600 mt-2" 
              />
              {isWaiting ? (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-400">
                    You are currently in the waiting list. The host will add you to the game when a spot becomes available.
                  </p>
                </div>
              ) : connectedPeers.length === maxPlayers && !isGameStarted ? (
                <p className="mt-2 text-sm text-gray-400">
                  Waiting for host to start the game...
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Active Players ({connectedPeers.length})</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedPeers.map((peer) => (
                <div
                  key={peer.id}
                  className={cn(
                    "bg-gray-800/20 border rounded-lg p-4",
                    peer.id === usePeerStore.getState().currentPeer?.id 
                      ? "border-blue-500 bg-blue-500/10" 
                      : "border-gray-700"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-lg font-medium text-white">
                        {peer.name}
                        {peer.id === usePeerStore.getState().currentPeer?.id && (
                          <span className="ml-2 text-sm text-blue-400">(you)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">ID: {peer.id}</p>
                    </div>
                    {isHost() && !isGameStarted && (
                      <Button
                        variant="semiTransparent"
                        size="sm"
                        onClick={() => movePlayerToWaiting(peer.id)}
                        className="text-xs w-32"
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
              <h2 className="text-lg font-semibold text-white">Waiting List ({waitingPeers.length})</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {waitingPeers.map((peer) => (
                  <div
                    key={peer.id}
                    className={cn(
                      "bg-gray-800/20 border rounded-lg p-4",
                      peer.id === usePeerStore.getState().currentPeer?.id 
                        ? "border-yellow-500 bg-yellow-500/10" 
                        : "border-gray-700"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-lg font-medium text-white">
                          {peer.name}
                          {peer.id === usePeerStore.getState().currentPeer?.id && (
                            <span className="ml-2 text-sm text-yellow-400">(you)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">ID: {peer.id}</p>
                      </div>
                      {isHost() && !isGameStarted && connectedPeers.length < maxPlayers && (
                        <Button
                          variant="semiTransparent"
                          size="sm"
                          onClick={() => movePlayerToGame(peer.id)}
                          className="text-xs w-32"
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