"use client";

import { useState } from "react";
import { usePeer } from "@/lib/hooks/use-peer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LobbyCodeInput } from "@/components/lobby-code-input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/Card";
import { GameRoom } from "./game-room";

export function Lobby() {
  const [playerName, setPlayerName] = useState("");
  const [gameId, setGameId] = useState("");
  const {
    hostId,
    isInGame,
    isCreating,
    isJoining,
    createGame,
    joinGame,
    leaveGame,
  } = usePeer();

  if (isInGame) {
    return <GameRoom onLeave={leaveGame} hostId={hostId} />;
  }

  return (
    <div
      className="h-screen w-screen flex items-center justify-center p-4 bg-cover bg-center overflow-hidden bg-[url('/src/assets/game-lobby-background.png')]"
    >
      <Card className="w-full max-w-md bg-gray-800/10 border-gray-700 backdrop-blur-md shadow-xl">
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
            className="bg-gray-800/20 border-gray-700 text-white placeholder:text-gray-400"
          />
        </CardContent>

        <div className="space-y-4">
          <CardContent className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Create New Game</h2>
            <Button 
              className="w-full" 
              onClick={() => createGame(playerName)}
              variant="semiTransparent"
              size="lg"
              disabled={!playerName || isCreating}
            >
              {isCreating ? "Creating..." : "Create Game"}
            </Button>
          </CardContent>

          <CardContent className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-800/10 px-2 text-gray-300">
                Or join existing game
              </span>
            </div>
          </CardContent>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Game Code
              </label>
              <LobbyCodeInput
                value={gameId}
                onChange={setGameId}
                disabled={isJoining}
                onEnter={() => joinGame(gameId, playerName)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => joinGame(gameId, playerName)}
              variant="semiTransparent"
              size="lg"
              disabled={!gameId || !playerName || isJoining || gameId.length !== 6}
            >
              {isJoining ? "Joining..." : "Join Game"}
            </Button>
          </CardContent>
        </div>
      </Card>
    </div>
  );
} 