import { useClientStore } from '@/lib/store/client-store';
import { useServerStore } from '@/lib/store/server-store';

export function DayStart() {
  const { gameState, currentPlayerData, playersList } = useClientStore();

  const eliminatedId = gameState.lastEliminated;
  const eliminatedPlayer = eliminatedId
    ? playersList.find((p) => p.id === eliminatedId)
    : null;

  const isEliminated = currentPlayerData?.id === eliminatedId;

  if (isEliminated) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-red-950/40 to-gray-950">
        <p className="text-7xl animate-fade-in-scale">💀</p>
        <p className="text-4xl font-black text-red-500 animate-fade-in-up animation-delay-200">Wasted</p>
        <p className="text-gray-400 text-sm animate-fade-in-up animation-delay-300">You've been eliminated during the night.</p>
        <button
          onClick={() => {
            const { leaveGame, host } = useServerStore.getState();
            if (host?.isActive) leaveGame();
            useClientStore.getState().clearStore();
          }}
          className="mt-4 rounded-full border border-gray-600 bg-gray-800 px-8 py-3 text-sm text-white animate-fade-in-up animation-delay-400"
        >
          Exit
        </button>
      </div>
    );
  }

  return (
    <div data-testid="phase-dayStart" className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-amber-950/20 to-gray-950 p-6">
      <p className="text-6xl animate-fade-in-scale">☀️</p>
      <p className="text-3xl font-black text-white animate-fade-in-up animation-delay-100">Day {gameState.day}</p>

      {eliminatedPlayer ? (
        <div className="rounded-2xl border border-red-800/60 bg-red-950/30 px-8 py-6 text-center animate-fade-in-up animation-delay-200">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Last night</p>
          <p className="text-3xl font-black text-red-400">
            #{eliminatedPlayer.index}
          </p>
          <p className="text-gray-400 text-sm mt-1">{eliminatedPlayer.name} was eliminated</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 px-8 py-6 text-center animate-fade-in-up animation-delay-200">
          <p className="text-emerald-400 font-medium">A peaceful night — no one was eliminated</p>
        </div>
      )}

      <p className="text-xs text-gray-600 animate-pulse">Discussion starting soon…</p>
    </div>
  );
}
