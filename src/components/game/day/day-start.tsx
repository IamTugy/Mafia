import { useClientStore } from '@/lib/store/client-store';

export function DayStart() {
  const { gameState, currentPlayerData, playersList } = useClientStore();

  const eliminatedId = gameState.lastEliminated;
  const eliminatedPlayer = eliminatedId
    ? playersList.find((p) => p.id === eliminatedId)
    : null;

  const isEliminated = currentPlayerData?.id === eliminatedId;

  if (isEliminated) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gray-950">
        <p className="text-7xl">💀</p>
        <p className="text-4xl font-bold text-red-500">Wasted</p>
        <p className="text-gray-400 text-sm">You've been eliminated.</p>
        <button
          onClick={() => useClientStore.getState().clearStore()}
          className="mt-4 rounded-full border border-gray-600 bg-gray-800 px-8 py-3 text-sm text-white"
        >
          Exit
        </button>
      </div>
    );
  }

  return (
    <div data-testid="phase-dayStart" className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gray-950 p-6">
      <p className="text-5xl">☀️</p>
      <p className="text-3xl font-bold text-white">Day {gameState.day}</p>

      {eliminatedPlayer ? (
        <div className="rounded-xl border border-red-800 bg-red-950/40 px-8 py-5 text-center">
          <p className="text-gray-400 text-sm mb-1">Last night</p>
          <p className="text-2xl font-bold text-red-400">
            #{eliminatedPlayer.index} was eliminated
          </p>
          <p className="text-gray-500 text-sm mt-1">{eliminatedPlayer.name}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-700 bg-gray-900 px-8 py-5 text-center">
          <p className="text-gray-300">No one was eliminated last night</p>
        </div>
      )}

      <p className="text-xs text-gray-600 animate-pulse">Discussion starting soon…</p>
    </div>
  );
}
