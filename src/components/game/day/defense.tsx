import { useClientStore } from '@/lib/store/client-store';
import { useCountdown } from '@/lib/hooks/use-countdown';
import { DEFENSE_TIME_SECONDS } from '@/lib/consts';
import { getAccusedList } from '@/lib/store/types';
import { playDing } from '@/lib/audio/tts';
import { CircularTimer } from '../shared/circular-timer';

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

  // Non-defending players watch
  if (!isDefending) {
    return (
      <div data-testid="phase-defense" className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-amber-950/15 to-gray-950 p-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Defense</p>
        {currentDefender && (
          <div className="flex flex-col items-center gap-2 animate-fade-in-up">
            <p className="text-6xl font-black text-white">#{currentDefender.index}</p>
            <p className="text-gray-400 text-sm">{currentDefender.name} is speaking</p>
          </div>
        )}
        <CircularTimer
          secondsLeft={secondsLeft}
          progress={progress}
          size={100}
          color="#6b7280"
          strokeWidth={6}
          textSize="text-3xl"
        />
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
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-amber-950/20 to-gray-950 p-6">
        <p className="text-2xl font-black text-amber-300 animate-fade-in-up">Your turn to defend</p>
        <p className="text-sm text-gray-500 animate-pulse">Get ready…</p>
      </div>
    );
  }

  return (
    <div data-testid="phase-defense" className="flex h-full w-full flex-col items-center justify-between bg-gradient-to-b from-amber-950/20 to-gray-950 p-6 pt-10 pb-10">
      <p className="text-sm font-medium text-amber-400/70 animate-fade-in-up">Your turn to defend</p>

      <CircularTimer
        secondsLeft={secondsLeft}
        progress={progress}
        color="#f59e0b"
      />

      <p className="text-gray-400 text-sm text-center">
        You have been accused. Speak in your defense.
      </p>

      <button
        data-testid="defense-done-btn"
        onClick={finish}
        className="w-48 rounded-full bg-amber-700 py-3 text-sm font-semibold text-white transition-all active:scale-95 active:bg-amber-800"
      >
        Done
      </button>
    </div>
  );
}
