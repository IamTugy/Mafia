import { useClientStore } from '@/lib/store/client-store';
import { useCountdown } from '@/lib/hooks/use-countdown';
import { DEFENSE_TIME_SECONDS } from '@/lib/consts';
import { getAccusedList } from '@/lib/store/types';
import { playDing } from '@/lib/audio/tts';

export function Defense() {
  const { gameState, currentPlayerData, playersList, sendAction } = useClientStore();

  const defenseIndex = gameState.defenseIndex ?? 0;
  const accusedList = getAccusedList(gameState);
  const currentDefenderId = accusedList[defenseIndex] ?? null;
  const isDefending = currentPlayerData?.id === currentDefenderId;

  const currentDefender = currentDefenderId
    ? playersList.find((p) => p.id === currentDefenderId)
    : null;

  const isInBuffer = gameState.speakerStartedAt != null && Date.now() < gameState.speakerStartedAt;

  const { secondsLeft, progress } = useCountdown({
    durationSeconds: DEFENSE_TIME_SECONDS,
    startedAt: gameState.speakerStartedAt,
    onExpire: playDing,
  });

  const finish = () => {
    playDing();
    sendAction({ type: 'finishSpeaking' });
  };

  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference * (1 - progress);

  // Non-defending players watch
  if (!isDefending) {
    return (
      <div data-testid="phase-defense" className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gray-950 p-6">
        <p className="text-sm text-gray-500 uppercase tracking-widest">Defense</p>
        {currentDefender && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-6xl font-black text-white">#{currentDefender.index}</p>
            <p className="text-gray-400 text-sm">{currentDefender.name} is speaking</p>
          </div>
        )}
        <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
          <svg width="100" height="100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="44" stroke="#1f2937" strokeWidth="6" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke={secondsLeft <= 10 ? '#ef4444' : '#6b7280'}
              strokeWidth="6"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <p className="relative text-3xl font-black text-white">{secondsLeft}</p>
        </div>
        {accusedList.length > 1 && (
          <p className="text-xs text-gray-600">
            {defenseIndex + 1} of {accusedList.length} accused
          </p>
        )}
      </div>
    );
  }

  // Defending player view
  if (isInBuffer) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gray-950 p-6">
        <p className="text-xl font-bold text-amber-300">Your turn to defend</p>
        <p className="text-sm text-gray-500 animate-pulse">Get ready…</p>
      </div>
    );
  }

  return (
    <div data-testid="phase-defense" className="flex h-full w-full flex-col items-center justify-between bg-gray-950 p-6 pt-10 pb-10">
      <p className="text-sm font-medium text-gray-400">Your turn to defend</p>

      {/* Circular timer */}
      <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
        <svg width="140" height="140" className="absolute inset-0 -rotate-90">
          <circle cx="70" cy="70" r="44" stroke="#1f2937" strokeWidth="8" fill="none" />
          <circle
            cx="70"
            cy="70"
            r="44"
            stroke={secondsLeft <= 10 ? '#ef4444' : '#f59e0b'}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-200"
          />
        </svg>
        <p className="relative text-5xl font-black text-white">{secondsLeft}</p>
      </div>

      <p className="text-gray-400 text-sm text-center">
        You have been accused. Speak in your defense.
      </p>

      <button
        data-testid="defense-done-btn"
        onClick={finish}
        className="w-48 rounded-full bg-amber-700 py-3 text-sm font-semibold text-white active:bg-amber-800"
      >
        Done
      </button>
    </div>
  );
}
