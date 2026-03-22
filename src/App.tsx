import { useEffect } from 'react';
import { Lobby } from './components/lobby/Lobby';
import { Game } from './components/game/game';
import { useClientStore } from './lib/store/client-store';

function App() {
  const gameState = useClientStore((state) => state.gameState);
  const isGameStarted = gameState.phase !== 'waiting';

  // Simulator mirror-click support: receive click coordinates via postMessage
  // and dispatch a real click at that position.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'mafia:simulate-click') return;
      const { x, y } = e.data;
      if (typeof x !== 'number' || typeof y !== 'number') return;
      const el = document.elementFromPoint(x, y);
      if (el instanceof HTMLElement) {
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true }));
        el.click();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden">
      {isGameStarted ? <Game /> : <Lobby />}
    </main>
  );
}

export default App;
