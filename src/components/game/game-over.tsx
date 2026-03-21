import { useClientStore } from '@/lib/store/client-store';
import { useServerStore } from '@/lib/store/server-store';
import { cn } from '@/lib/utils';

export function GameOver() {
  const { gameState, playersList } = useClientStore();
  const leaveGame = useServerStore((s) => s.leaveGame);
  const clearClientStore = useClientStore((s) => s.clearStore);

  const winner = gameState.winner ?? 'mafia';
  const isMafiaWin = winner === 'mafia';

  const handleLeave = () => {
    leaveGame();
    clearClientStore();
  };

  return (
    <div data-testid="game-over" className="flex h-full w-full flex-col items-center justify-between bg-gray-950 p-6 pt-12 pb-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-6xl">{isMafiaWin ? '🔪' : '⭐'}</p>
        <h2 className="text-3xl font-black text-white">Game Over</h2>
        <p
          className={cn(
            'text-2xl font-bold',
            isMafiaWin ? 'text-red-400' : 'text-green-400'
          )}
        >
          {isMafiaWin ? 'Mafia Wins!' : 'Civilians Win!'}
        </p>
        <p className="text-sm text-gray-500">
          {isMafiaWin
            ? 'The Mafia successfully took over the city.'
            : 'The citizens rooted out the Mafia.'}
        </p>
      </div>

      {/* Player list with roles revealed */}
      <div className="w-full max-w-sm space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest text-center mb-3">
          Who was who
        </p>
        {[...playersList]
          .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
          .map((p) => {
            const roleLabel: Record<string, string> = {
              don: '🎩 Don',
              mafia: '🔪 Mafia',
              sheriff: '⭐ Sheriff',
              civilian: '👤 Civilian',
            };
            const roleText = p.role ? (roleLabel[p.role] ?? p.role) : null;
            const isMafiaRole = p.role === 'don' || p.role === 'mafia';
            const isSheriff = p.role === 'sheriff';
            return (
              <div
                key={p.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-4 py-2',
                  p.status === 'eliminated'
                    ? 'border-gray-800 bg-gray-900/40 opacity-60'
                    : 'border-gray-700 bg-gray-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-white">#{p.index}</span>
                  <span className="text-sm text-gray-300">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {roleText && (
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        isMafiaRole ? 'text-red-400' : isSheriff ? 'text-yellow-300' : 'text-gray-400'
                      )}
                    >
                      {roleText}
                    </span>
                  )}
                  {p.status === 'eliminated' && (
                    <span className="text-xs text-gray-600">✕</span>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <button
        onClick={handleLeave}
        className="w-48 rounded-full border border-gray-600 bg-gray-800 py-3 text-sm text-white active:bg-gray-700"
      >
        Back to Lobby
      </button>
    </div>
  );
}
