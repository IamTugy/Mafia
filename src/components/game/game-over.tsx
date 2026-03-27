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
    <div
      data-testid="game-over"
      className={cn(
        'flex h-full w-full flex-col items-center justify-between overflow-hidden p-6 pt-12 pb-10',
        isMafiaWin
          ? 'bg-gradient-to-b from-red-950/60 via-gray-950 to-gray-950'
          : 'bg-gradient-to-b from-emerald-950/40 via-gray-950 to-gray-950'
      )}
    >
      <div className="flex shrink-0 flex-col items-center gap-3 text-center animate-fade-in-up">
        <p className="text-7xl">{isMafiaWin ? '🔪' : '⭐'}</p>
        <h2 className="text-4xl font-black tracking-tight text-white">Game Over</h2>
        <p
          className={cn(
            'text-2xl font-bold',
            isMafiaWin ? 'text-red-400' : 'text-green-400'
          )}
        >
          {isMafiaWin ? 'Mafia Wins!' : 'Civilians Win!'}
        </p>
        <p className="max-w-xs text-sm text-gray-500">
          {isMafiaWin
            ? 'The Mafia successfully took over the city.'
            : 'The citizens rooted out the Mafia.'}
        </p>
      </div>

      {/* Player list with roles revealed */}
      <div className="w-full max-w-sm space-y-2 overflow-y-auto min-h-0 animate-fade-in-up animation-delay-200">
        <p className="text-xs text-gray-500 uppercase tracking-widest text-center mb-3">
          Who was who
        </p>
        {[...playersList]
          .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
          .map((p, i) => {
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
                  'flex items-center justify-between rounded-xl border px-4 py-3 animate-fade-in-up',
                  p.status === 'eliminated'
                    ? 'border-gray-800 bg-gray-900/30 opacity-50'
                    : isMafiaRole
                    ? 'border-red-900/50 bg-red-950/20'
                    : isSheriff
                    ? 'border-yellow-900/50 bg-yellow-950/20'
                    : 'border-gray-800 bg-gray-900/40'
                )}
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-sm font-bold text-white">
                    {p.index}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-gray-200">{p.name}</span>
                    {p.status === 'eliminated' && (
                      <span className="ml-2 text-xs text-gray-600">eliminated</span>
                    )}
                  </div>
                </div>
                {roleText && (
                  <span
                    className={cn(
                      'text-xs font-bold',
                      isMafiaRole ? 'text-red-400' : isSheriff ? 'text-yellow-300' : 'text-gray-500'
                    )}
                  >
                    {roleText}
                  </span>
                )}
              </div>
            );
          })}
      </div>

      <button
        onClick={handleLeave}
        className="w-48 shrink-0 rounded-full border border-gray-600 bg-gray-800 py-3 text-sm font-medium text-white transition-colors active:bg-gray-700 animate-fade-in-up animation-delay-500"
      >
        Back to Lobby
      </button>
    </div>
  );
}
