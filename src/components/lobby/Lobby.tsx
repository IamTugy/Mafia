import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LobbyCodeInput } from '@/components/lobby/lobby-code-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { GameRoom } from '../game-room';
import { useClientPeer } from '@/lib/hooks/use-client-peer';
import { useServerStore } from '@/lib/store/server-store';
import { useClientStore } from '@/lib/store/client-store';

export function Lobby() {
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');
  const host = useClientStore((state) => state.host);
  const isHostActive = useServerStore((state) => state.host?.isActive);
  const leaveGame = useServerStore((state) => state.leaveGame);
  const initializeHost = useServerStore((state) => state.initializeHost);

  const {
    connectToHost,
    isConnected,
    isConnecting,
    error,
    leaveGame: leaveGameClient,
  } = useClientPeer();

  const createGame = useCallback(async () => {
    const host = await initializeHost();
    await connectToHost(host.id, playerName);
  }, [playerName, connectToHost, initializeHost]);

  if (isConnected && host) {
    return (
      <GameRoom
        onLeave={() => {
          leaveGame();
          leaveGameClient();
        }}
        hostId={host.id}
      />
    );
  }

  return (
    <div className="flex size-full items-center justify-center overflow-scroll bg-[url('/src/assets/game-lobby-background.png')] bg-cover bg-center p-4">
      <Card className="max-h-3/4 w-full max-w-md overflow-scroll border-gray-700 bg-gray-800/10 shadow-xl backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">Game Lobby</CardTitle>
          <CardDescription className="text-gray-300">
            Create a new game or join an existing one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <label htmlFor="playerName" className="text-sm font-medium text-white">
            Your Name
          </label>
          <Input
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="border-gray-700 bg-gray-800/20 text-white placeholder:text-gray-400"
          />
        </CardContent>

        <div className="space-y-4">
          <CardContent className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Create New Game</h2>
            <Button
              className="w-full"
              onClick={createGame}
              variant="semiTransparent"
              size="lg"
              disabled={!playerName || isConnecting}
            >
              {isHostActive && isConnecting ? 'Creating...' : 'Create Game'}
            </Button>
          </CardContent>

          <CardContent className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex items-center justify-center text-xs uppercase">
              <span className="self-center rounded-md bg-gray-800 px-2 py-1 text-gray-300">
                Or join existing game
              </span>
            </div>
          </CardContent>

          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <label className="text-sm font-medium text-white">Game Code</label>
              <LobbyCodeInput
                value={gameId}
                onChange={setGameId}
                disabled={isConnecting}
                onEnter={async () => await connectToHost(gameId, playerName)}
              />
            </div>
            <Button
              className="w-full"
              onClick={async () => await connectToHost(gameId, playerName)}
              variant="semiTransparent"
              size="lg"
              disabled={!gameId || !playerName || isConnecting || gameId.length !== 6}
            >
              {!isHostActive && isConnecting ? 'Joining...' : 'Join Game'}
            </Button>
          </CardContent>

          {error && (
            <div className="px-6">
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
