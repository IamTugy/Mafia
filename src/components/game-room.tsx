import { usePeerStore } from '@/lib/store/peer-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface GameRoomProps {
  onLeave: () => void;
  hostId: string;
}

export function GameRoom({ onLeave }: GameRoomProps) {
  const { isHost, hostId, connectedPeers } = usePeerStore();
  const peerList = Array.from(connectedPeers.values());

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4 bg-cover bg-center overflow-hidden bg-[url('/src/assets/game-lobby-background.png')]">
      <Card className="w-full max-w-4xl bg-gray-800/10 border-gray-700 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl flex-1 font-bold text-white">
              {isHost() ? 'Game Room (Host)' : 'Game Room'}
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
          {hostId && (
            <div className="bg-gray-800/20 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">Game Code</p>
                  <p className="text-2xl font-mono tracking-wider text-white mt-1">{hostId}</p>
                </div>
                <Button
                  variant="semiTransparent"
                  onClick={() => {
                    navigator.clipboard.writeText(hostId);
                  }}
                  className="w-20"
                >
                  Copy
                </Button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Share this code with other players to join the game
              </p>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Connected Players</h2>
            {peerList.length === 0 ? (
              <div className="bg-gray-800/20 border border-gray-700 rounded-lg p-8 text-center">
                <p className="text-gray-400">No players connected yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {peerList.map((peer) => (
                  <Card key={peer.id} className="bg-gray-800/20 border-gray-700">
                    <CardContent className="p-4">
                      <p className="text-lg font-medium text-white">{peer.name}</p>
                      <p className="text-sm text-gray-400 mt-1">ID: {peer.id}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 