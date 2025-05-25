"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/Card";
import { PlusCircle, Gamepad2 } from "lucide-react";

export function Lobby() {
  const [gameCode, setGameCode] = useState("");

  const handleCreateGame = () => {
    // TODO: Implement game creation logic
    console.log("Creating new game...");
  };

  const handleJoinGame = () => {
    // TODO: Implement join game logic
    console.log("Joining game with code:", gameCode);
  };

  return (
    <div
      className="h-screen w-screen flex items-center justify-center p-4 bg-cover bg-center overflow-hidden bg-[url('/src/assets/mafia-vertical-background.png')] sm:bg-[url('/src/assets/mafia-horizontal-background.png')]"
    >
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center sm:bg-[url('/src/assets/mafia-horizontal-background.png')] bg-[url('/src/assets/mafia-vertical-background.png')]"
        aria-hidden="true"
      />
      <Card className="w-full max-w-md bg-gray-800/10 border-gray-700 backdrop-blur-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">Game Lobby</CardTitle>
          <CardDescription className="text-gray-300">
            Create a new game or join an existing one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button
              onClick={handleCreateGame}
              variant="semiTransparent"
              size="lg"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Game
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-800/80 px-2 text-gray-400">or</span>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter game code"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value)}
                className="bg-gray-700/80 border-gray-600 text-white placeholder:text-gray-400"
              />
              <Button
                onClick={handleJoinGame}
                variant="semiTransparent"
                size="lg"
              >
                <Gamepad2 className="mr-2 h-5 w-5" />
                Join Game
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 