import { useEffect, useState } from 'react';
import { useClientStore } from '@/lib/store/client-store';
import { useCountdown } from '@/lib/hooks/use-countdown';
import { NIGHT_INVESTIGATION_TIMEOUT_MS, NIGHT_ROLE_WAKE_DELAY_MS } from '@/lib/consts';
import { NumberGrid } from './number-grid';
import { SleepScreen } from './sleep-screen';

interface InvestigationPhaseProps {
  role: 'sheriff' | 'don';
  testId: string;
  title: string;
  titleColor: string;
  selectPrompt: string;
  formatResult: (result: string) => { label: string; color: string };
  extraDisabledIds?: string[];
  continueButtonColor: string;
  continueButtonActiveColor: string;
}

export function InvestigationPhase({
  role,
  testId,
  title,
  titleColor,
  selectPrompt,
  formatResult,
  extraDisabledIds = [],
  continueButtonColor,
  continueButtonActiveColor,
}: InvestigationPhaseProps) {
  const { currentPlayerData, playersList, gameState, sendAction } = useClientStore();
  const [awake, setAwake] = useState(false);

  const isMyRole = currentPlayerData?.role === role;
  const hasResult = !!currentPlayerData?.lastInvestigationResult;
  const disabledIds = [
    ...extraDisabledIds,
    ...(gameState.lastEliminated ? [gameState.lastEliminated] : []),
  ];

  const phaseStartedAt = gameState.phaseStartedAt ?? Date.now();

  useEffect(() => {
    if (!isMyRole) return;
    const remaining = NIGHT_ROLE_WAKE_DELAY_MS - (Date.now() - phaseStartedAt);
    if (remaining <= 0) { setAwake(true); return; }
    const id = setTimeout(() => setAwake(true), remaining);
    return () => clearTimeout(id);
  }, [isMyRole, phaseStartedAt]);

  const { secondsLeft } = useCountdown({
    durationSeconds: NIGHT_INVESTIGATION_TIMEOUT_MS / 1000,
    startedAt: gameState.phaseStartedAt,
  });

  if (!isMyRole || !awake) {
    return <SleepScreen testId={testId} secondsLeft={secondsLeft} />;
  }

  const result = currentPlayerData?.lastInvestigationResult
    ? formatResult(currentPlayerData.lastInvestigationResult)
    : null;

  return (
    <div
      data-testid={testId}
      className="flex h-full w-full flex-col items-center gap-6 bg-gray-950 p-6 pt-10"
    >
      <div className="flex flex-col items-center gap-1 animate-fade-in-up">
        <p className={`text-2xl font-black ${titleColor}`}>{title}</p>
        <p className="text-sm text-gray-500">Seat #{currentPlayerData?.index}</p>
        <p className="text-xs text-gray-700">{secondsLeft}s remaining</p>
      </div>

      {!hasResult ? (
        <div className="w-full animate-fade-in-up animation-delay-200">
          <p className="text-sm text-gray-400 text-center mb-4">{selectPrompt}</p>
          <NumberGrid
            players={playersList}
            onSelect={(targetId) => sendAction({ type: 'investigate', targetId })}
            excludeId={currentPlayerData?.id}
            disabledIds={disabledIds}
            className="w-full"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 mt-4 animate-fade-in-scale">
          <div className="rounded-2xl border-2 border-gray-700 bg-gray-900/80 px-14 py-10 text-center shadow-lg">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Investigation result</p>
            <p className={`text-4xl font-black ${result?.color}`}>{result?.label}</p>
          </div>
          {gameState.investigationContinueAt ? (
            <p className="text-sm text-gray-500">Waiting for night to end…</p>
          ) : (
            <button
              data-testid={`${role}-continue-btn`}
              onClick={() => sendAction({ type: 'continue' })}
              className={`w-40 rounded-full ${continueButtonColor} py-3 text-sm font-semibold text-white active:${continueButtonActiveColor} transition-colors`}
            >
              Continue
            </button>
          )}
        </div>
      )}
    </div>
  );
}
