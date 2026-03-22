import { useEffect } from 'react';
import { Lobby } from './components/lobby/Lobby';
import { Game } from './components/game/game';
import { useClientStore } from './lib/store/client-store';

function App() {
  const gameState = useClientStore((state) => state.gameState);
  const isGameStarted = gameState.phase !== 'waiting';

  // Simulator mirror-click support: receive click coordinates via postMessage
  // and dispatch pointer + click events at that position.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'mafia:simulate-click') return;
      const { x, y } = e.data;
      if (typeof x !== 'number' || typeof y !== 'number') return;
      const el = document.elementFromPoint(x, y);
      if (!(el instanceof HTMLElement)) return;

      const opts: PointerEventInit = {
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
      };

      el.dispatchEvent(new PointerEvent('pointerdown', opts));
      // Delay pointerup so hold-to-reveal timers (even 0ms) can fire
      setTimeout(() => {
        const upEl = document.elementFromPoint(x, y);
        if (upEl instanceof HTMLElement) {
          upEl.dispatchEvent(new PointerEvent('pointerup', opts));
          upEl.click();
        }
      }, 50);
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
