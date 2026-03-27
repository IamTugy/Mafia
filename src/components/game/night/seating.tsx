import { useState } from 'react';
import { useClientStore } from '@/lib/store/client-store';

export function Seating() {
  const { currentPlayerData, playersList, gameState, sendAction } = useClientStore();
  const [confirmed, setConfirmed] = useState(false);

  const readyCount = gameState.readyPlayers?.length ?? 0;
  const totalInGame = playersList.filter((p) => p.status === 'inGame').length;

  // All players sorted by seat index — shown so everyone can verify the order
  const sortedPlayers = [...playersList]
    .filter((p) => p.status === 'inGame' && p.index != null)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const handleConfirm = () => {
    setConfirmed(true);
    sendAction({ type: 'ready' });
  };

  if (!currentPlayerData) return null;

  return (
    <div data-testid="phase-seating" className="flex h-full w-full flex-col items-center justify-between bg-gray-950 p-6 pt-10 pb-10 select-none">
      <div className="flex flex-col items-center gap-3 text-center animate-fade-in-up">
        <p className="text-4xl font-black text-white">Your seat</p>
        <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-gray-800 shadow-lg shadow-white/10">
          <span className="text-7xl font-black text-white">{currentPlayerData.index}</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">Sit in this position around the table</p>
      </div>

      {/* Seat order overview */}
      <div className="w-full max-w-xs">
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-3">
          Sitting order
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {sortedPlayers.map((p) => {
            const isMe = p.id === currentPlayerData.id;
            const isReady = gameState.readyPlayers?.includes(p.id) ?? false;
            return (
              <div
                key={p.id}
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold border-2',
                  isReady
                    ? 'border-green-500 bg-green-900/50 text-green-300'
                    : isMe
                    ? 'border-white bg-white text-gray-900'
                    : 'border-gray-600 bg-gray-800 text-gray-300',
                ].join(' ')}
              >
                {p.index}
              </div>
            );
          })}
        </div>
      </div>

      {!confirmed ? (
        <button
          data-testid="seating-confirm-btn"
          onClick={handleConfirm}
          className="w-56 rounded-full bg-white py-4 text-base font-bold text-gray-900 transition-all active:scale-95 active:bg-gray-200 animate-fade-in-up animation-delay-200"
        >
          I'm in my seat
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-green-400 text-sm font-medium">Confirmed!</p>
          <p className="text-gray-500 text-xs">
            {readyCount} / {totalInGame} seated
          </p>
        </div>
      )}
    </div>
  );
}
