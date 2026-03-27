import { useClientStore } from '@/lib/store/client-store';
import { useCountdown } from '@/lib/hooks/use-countdown';
import { LAST_WORDS_SECONDS } from '@/lib/consts';
import { playDing } from '@/lib/audio/tts';
import { CircularTimer } from '../shared/circular-timer';

function VoteResultsGrid() {
  const voteResults = useClientStore((s) => s.gameState.voteResults);
  if (!voteResults || voteResults.length === 0) return null;
  return (
    <div className="mt-4 w-full max-w-xs">
      <p className="mb-2 text-center text-xs text-red-400/60 uppercase tracking-widest">Votes</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {voteResults.map((v) => (
          <div key={v.voterSeat} className="flex items-center justify-between text-sm">
            <span className="text-red-300/80">#{v.voterSeat}</span>
            <span className="text-red-600">&rarr;</span>
            <span className="font-bold text-white">#{v.targetSeat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const handleDone = () => {
    playDing();
    sendAction({ type: 'finishSpeaking' });
  };

  if (isEliminated) {
    return (
      <div className="flex h-full w-full flex-col items-center bg-gradient-to-b from-red-950 via-red-950/80 to-gray-950 p-6 pt-10 pb-6">
        <p className="text-3xl font-black text-red-200 animate-fade-in-up">Your Last Words</p>

        <VoteResultsGrid />

        <CircularTimer
          secondsLeft={secondsLeft}
          progress={progress}
          color="#fca5a5"
          trackColor="#7f1d1d"
          textSize="text-4xl"
          className="mt-auto"
        />

        <button
          onClick={handleDone}
          className="mt-4 w-48 rounded-full bg-red-800 py-3 text-sm font-semibold text-white active:bg-red-900"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center bg-gradient-to-b from-red-950 via-red-950/80 to-gray-950 p-6 pt-10 pb-6">
      <div className="flex flex-col items-center gap-2 text-center animate-fade-in-up">
        <p className="text-2xl font-black text-red-200">
          #{eliminatedPlayer?.index ?? '?'} — Last Words
        </p>
        <p className="text-sm text-red-400/70">Listen to their final statement…</p>
      </div>

      <VoteResultsGrid />

      <CircularTimer
        secondsLeft={secondsLeft}
        progress={progress}
        color="#fca5a5"
        trackColor="#7f1d1d"
        textSize="text-4xl"
        className="mt-auto"
      />

      <p className="mt-2 text-sm text-red-400/40">Seconds remaining</p>
    </div>
  );
}
