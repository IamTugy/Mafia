import { useClientStore } from '@/lib/store/client-store';
import { useCountdown } from '@/lib/hooks/use-countdown';
import { NIGHT_INVESTIGATION_TIMEOUT_MS } from '@/lib/consts';
import { NumberGrid } from '../shared/number-grid';

export function DonCheck() {
  const { currentPlayerData, playersList, gameState, sendAction } = useClientStore();

  const isDon = currentPlayerData?.role === 'don';
  const hasResult = !!currentPlayerData?.lastInvestigationResult;
  const history = currentPlayerData?.investigationHistory ?? [];
  const disabledIds = gameState.lastEliminated
    ? [...history, gameState.lastEliminated]
    : history;

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

  if (!isDon) {
    return (
      <div data-testid="phase-donCheck" className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gray-950">
        <p className="text-5xl">😴</p>
        <p className="text-lg text-gray-500">Keep your eyes closed…</p>
        <p className="text-sm text-gray-700">{secondsLeft}s</p>
      </div>
    );
  }

  const isSheriff = currentPlayerData?.lastInvestigationResult === 'sheriff';
  const resultColor = isSheriff ? 'text-yellow-300' : 'text-gray-300';
  const resultLabel = isSheriff ? '⭐ SHERIFF' : '✓ NOT SHERIFF';

  return (
    <div data-testid="phase-donCheck" className="flex h-full w-full flex-col items-center gap-6 bg-gray-950 p-6 pt-10">
      <div className="flex flex-col items-center gap-1">
        <p className="text-xl font-bold text-red-400">🎩 Don</p>
        <p className="text-sm text-gray-400">Seat #{currentPlayerData?.index}</p>
        <p className="text-xs text-gray-600">{secondsLeft}s remaining</p>
      </div>

      {!hasResult ? (
        <>
          <p className="text-sm text-gray-400">Is this player the Sheriff?</p>
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
            data-testid="don-continue-btn"
            onClick={continueNight}
            className="w-40 rounded-full bg-red-700 py-3 text-sm font-semibold text-white active:bg-red-800"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
