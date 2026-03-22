import { useClientStore } from '@/lib/store/client-store';
import { useCountdown } from '@/lib/hooks/use-countdown';
import { NIGHT_INVESTIGATION_TIMEOUT_MS } from '@/lib/consts';
import { NumberGrid } from '../shared/number-grid';

export function SheriffCheck() {
  const { currentPlayerData, playersList, gameState, sendAction } = useClientStore();

  const isSheriff = currentPlayerData?.role === 'sheriff';
  const hasResult = !!currentPlayerData?.lastInvestigationResult;
  // Sheriff can re-investigate any player each night (history is informational only).
  // Only disable the player killed this very night (not yet officially eliminated).
  const disabledIds = gameState.lastEliminated ? [gameState.lastEliminated] : [];

  const { secondsLeft } = useCountdown({
    durationSeconds: NIGHT_INVESTIGATION_TIMEOUT_MS / 1000,
    startedAt: gameState.phaseStartedAt,
  });

  const investigate = (targetId: string) => {
    sendAction({ type: 'investigate', targetId });
  };

  const continueNight = () => {
    sendAction({ type: 'continue' });
  };

  if (!isSheriff) {
    return (
      <div data-testid="phase-sheriffCheck" className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gray-950">
        <p className="text-5xl">😴</p>
        <p className="text-lg text-gray-500">Keep your eyes closed…</p>
        <p className="text-sm text-gray-700">{secondsLeft}s</p>
      </div>
    );
  }

  const resultIsMafia = currentPlayerData?.lastInvestigationResult === 'mafia';
  const resultColor = resultIsMafia ? 'text-red-400' : 'text-green-400';
  const resultLabel = resultIsMafia ? '🔴 MAFIA' : '🟢 VILLAGE';

  return (
    <div data-testid="phase-sheriffCheck" className="flex h-full w-full flex-col items-center gap-6 bg-gray-950 p-6 pt-10">
      <div className="flex flex-col items-center gap-1">
        <p className="text-xl font-bold text-yellow-300">⭐ Sheriff</p>
        <p className="text-sm text-gray-400">Seat #{currentPlayerData?.index}</p>
        <p className="text-xs text-gray-600">{secondsLeft}s remaining</p>
      </div>

      {!hasResult ? (
        <>
          <p className="text-sm text-gray-400">Tap a player to investigate</p>
          <NumberGrid
            players={playersList}
            onSelect={investigate}
            excludeId={currentPlayerData?.id}
            disabledIds={disabledIds}
            className="w-full"
          />
        </>
      ) : (
        <div className="flex flex-col items-center gap-6 mt-4">
          <div className="rounded-2xl border-2 border-gray-700 bg-gray-900 px-12 py-8 text-center">
            <p className="text-sm text-gray-400 mb-2">Investigation result</p>
            <p className={`text-3xl font-bold ${resultColor}`}>{resultLabel}</p>
          </div>
          <button
            data-testid="sheriff-continue-btn"
            onClick={continueNight}
            className="w-40 rounded-full bg-yellow-600 py-3 text-sm font-semibold text-white active:bg-yellow-700"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
