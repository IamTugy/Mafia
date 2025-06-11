import { Lobby } from './components/lobby/Lobby';
import { Game } from './components/game/game';
import { useClientStore } from './lib/store/client-store';

function App() {
  const gameState = useClientStore((state) => state.gameState);
  const isGameStarted = gameState.phase !== 'waiting';

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden">
      {isGameStarted ? <Game /> : <Lobby />}
    </main>
  );
}

export default App;
