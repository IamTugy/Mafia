import { useClientStore } from '@/lib/store/client-store';
import { useCountdown } from '@/lib/hooks/use-countdown';
import { LAST_WORDS_SECONDS } from '@/lib/consts';
import { playDing } from '@/lib/audio/tts';

export function LastWords() {
  const { gameState, currentPlayerData, playersList, sendAction } = useClientStore();

  const eliminatedId = gameState.lastEliminated;
  const isEliminated = currentPlayerData?.id === eliminatedId;
  const eliminatedPlayer = playersList.find((p) => p.id === eliminatedId);

  const { secondsLeft, progress } = useCountdown({
    durationSeconds: LAST_WORDS_SECONDS,
    startedAt: gameState.phaseStartedAt,
    onExpire: playDing,
  });

  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference * (1 - progress);

  const handleDone = () => {
    playDing();
    sendAction({ type: 'finishSpeaking' });
  };

  if (isEliminated) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-between bg-red-950 p-6 pt-10 pb-10">
        <p className="text-3xl font-black text-red-200">Your Last Words</p>

        {/* Circular timer */}
        <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
          <svg width="160" height="160" className="absolute inset-0 -rotate-90">
            <circle cx="80" cy="80" r="44" stroke="#7f1d1d" strokeWidth="8" fill="none" />
            <circle
              cx="80" cy="80" r="44"
              stroke={secondsLeft <= 10 ? '#ef4444' : '#fca5a5'}
              strokeWidth="8" fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-all duration-200"
            />
          </svg>
          <p className="relative text-5xl font-black text-white">{secondsLeft}</p>
        </div>

        <button
          onClick={handleDone}
          className="w-48 rounded-full bg-red-800 py-3 text-sm font-semibold text-white active:bg-red-900"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-between bg-red-950 p-6 pt-12 pb-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-2xl font-black text-red-200">
          #{eliminatedPlayer?.index ?? '?'} — Last Words
        </p>
        <p className="text-sm text-red-400">Listen…</p>
      </div>

      {/* Circular timer */}
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
        <svg width="160" height="160" className="absolute inset-0 -rotate-90">
          <circle cx="80" cy="80" r="44" stroke="#7f1d1d" strokeWidth="8" fill="none" />
          <circle
            cx="80" cy="80" r="44"
            stroke={secondsLeft <= 10 ? '#ef4444' : '#fca5a5'}
            strokeWidth="8" fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-200"
          />
        </svg>
        <p className="relative text-5xl font-black text-white">{secondsLeft}</p>
      </div>

      <p className="text-sm text-red-400/60">Seconds remaining</p>
    </div>
  );
}
