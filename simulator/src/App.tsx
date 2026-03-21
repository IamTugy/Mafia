import { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { PhoneGrid } from './components/PhoneGrid';

const DEFAULT_COUNT = 10;
const MIN_COUNT = 5;
const MAX_COUNT = 10;

function parseParams() {
  const params = new URLSearchParams(window.location.search);
  const gameCode = params.get('gameCode') ?? '';
  const countRaw = parseInt(params.get('count') ?? '', 10);
  const count = isNaN(countRaw)
    ? DEFAULT_COUNT
    : Math.min(MAX_COUNT, Math.max(MIN_COUNT, countRaw));
  const startIndexRaw = parseInt(params.get('startIndex') ?? '', 10);
  const startIndex = isNaN(startIndexRaw) ? 1 : Math.max(1, startIndexRaw);
  const hostFirst = params.get('hostFirst') === 'true';
  return { gameCode, count, startIndex, hostFirst };
}

export default function App() {
  const { gameCode: initialGameCode, count: initialCount, startIndex, hostFirst } = parseParams();
  const [gameCode, setGameCode] = useState(initialGameCode);
  const [count, setCount] = useState(initialCount);
  const [refreshKey, setRefreshKey] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  // When hostFirst=true, phone 0 is the host. It posts the game code here via postMessage.
  useEffect(() => {
    if (!hostFirst) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'mafia:game-code' && e.data.code) {
        setGameCode(e.data.code);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [hostFirst]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Toolbar
        count={count}
        onCountChange={setCount}
        onRefreshAll={() => setRefreshKey((k) => k + 1)}
        onResetLayout={() => setResetKey((k) => k + 1)}
      />
      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <PhoneGrid
          gameCode={gameCode}
          count={count}
          refreshKey={refreshKey}
          resetKey={resetKey}
          startIndex={startIndex}
          hostFirst={hostFirst}
        />
      </div>
    </div>
  );
}
