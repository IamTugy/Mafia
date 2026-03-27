import { useClientStore } from '@/lib/store/client-store';
import { useCountdown } from '@/lib/hooks/use-countdown';
import { DISCUSSION_TIME_SECONDS } from '@/lib/consts';
import { getAccusedList } from '@/lib/store/types';
import { playDing } from '@/lib/audio/tts';
import { NumberGrid } from '../shared/number-grid';
import { CircularTimer } from '../shared/circular-timer';
import { useState } from 'react';

export function Discussion() {
  const { gameState, currentPlayerData, playersList, sendAction } = useClientStore();
  const [showAccusePicker, setShowAccusePicker] = useState(false);

  const currentSeat = gameState.speakerQueue?.[0] ?? null;
  const isSpeaking = currentPlayerData?.index === currentSeat;
  const myId = currentPlayerData?.id ?? '';

  // All accusations (speakerId -> targetId)
  const accusations = gameState.accusations ?? {};
  // My current accusation (changeable while speaking)
  const myAccusation = accusations[myId] ?? null;
  // Finalized accused list (for defense/vote)
  const accusedList = getAccusedList(gameState);

  // IDs with a red highlight: anyone currently accused by any speaker
  const allAccusedIds = Object.values(accusations);
  // IDs locked by OTHER speakers (can't be re-accused)
  const lockedByOthers = Object.entries(accusations)
    .filter(([sid]) => sid !== myId)
    .map(([, tid]) => tid);

  const isInBuffer = gameState.speakerStartedAt != null && Date.now() < gameState.speakerStartedAt;

  const { secondsLeft, progress } = useCountdown({
    durationSeconds: DISCUSSION_TIME_SECONDS,
    startedAt: gameState.speakerStartedAt,
    onExpire: playDing,
  });

  const finishSpeaking = () => {
    playDing();
    sendAction({ type: 'finishSpeaking' });
  };

  const accuse = (targetId: string) => {
    sendAction({ type: 'accuse', targetId });
    setShowAccusePicker(false);
  };

  const isEliminated = currentPlayerData?.status === 'eliminated';

  // Eliminated player special view — full screen upside-down with X and exit button
  // Eliminated players are handled globally in game.tsx — this branch is never reached
  if (isEliminated) return null;

  // Non-speaking player view — show own seat number upside-down
  if (!isSpeaking) {
    const myIndex = currentPlayerData?.index;
    const isAccused = allAccusedIds.includes(myId);

    return (
      <div data-testid="phase-discussion" className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gray-950">
        {/* Subtle background glow when accused */}
        {isAccused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-80 w-80 rounded-full bg-red-900/15 blur-3xl animate-slow-breathe" />
          </div>
        )}

        {/* Seat number, upside-down for the player across the table */}
        <div style={{ transform: 'rotate(180deg)' }} className="flex flex-col items-center">
          <p className="text-gray-500 text-base font-medium">Your seat</p>
          <div className="relative flex items-center justify-center">
            <p
              className={[
                'font-black leading-none select-none transition-colors duration-500',
                isAccused ? 'text-red-400' : 'text-white',
              ].join(' ')}
              style={{ fontSize: 'min(38vw, 200px)' }}
            >
              {myIndex ?? '?'}
            </p>
          </div>
        </div>

        {/* Accused numbers shown as red pills at top */}
        {accusedList.length > 0 && (
          <div className="absolute top-6 flex flex-wrap justify-center gap-2 px-4">
            {accusedList.map((id) => {
              const p = playersList.find((pl) => pl.id === id);
              return (
                <span key={id} className="rounded-full bg-red-900/50 border border-red-800/60 px-3 py-1 text-sm font-bold text-red-300">
                  #{p?.index}
                </span>
              );
            })}
          </div>
        )}

        {currentSeat != null && (
          <p className="absolute bottom-8 text-sm text-gray-600">
            Speaking: #{currentSeat}
          </p>
        )}
      </div>
    );
  }

  // Speaking player view

  // Buffer: phone is still narrating, don't show countdown yet
  if (isInBuffer) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gray-950 p-6">
        <p className="text-2xl font-black text-white animate-fade-in-up">Your turn to speak</p>
        <p className="text-sm text-gray-500 animate-pulse">Get ready…</p>
      </div>
    );
  }

  return (
    <div data-testid="phase-discussion" className="flex h-full w-full flex-col items-center justify-between bg-gray-950 p-5 pt-8 pb-8">
      <p className="text-sm font-medium text-gray-400 animate-fade-in-up">Your turn to speak</p>

      <CircularTimer secondsLeft={secondsLeft} progress={progress} />

      {/* Accusation picker or current accusation display */}
      {showAccusePicker ? (
        <div className="flex w-full flex-col gap-3">
          <p className="text-center text-sm text-gray-400">
            Accuse a player{myAccusation ? ' (tap to change)' : ''}:
          </p>
          <NumberGrid
            players={playersList}
            onSelect={accuse}
            excludeId={myId}
            selectedId={myAccusation}
            disabledIds={lockedByOthers}
            redIds={Object.values(accusations)}
            className="w-full"
          />
          <button
            onClick={() => setShowAccusePicker(false)}
            className="text-sm text-gray-500 underline text-center"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-3">
          {/* Show current accusation in red */}
          {myAccusation && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Accused:</span>
              <span className="rounded-full bg-red-800 px-4 py-1 font-bold text-red-200">
                #{playersList.find((p) => p.id === myAccusation)?.index}
              </span>
              <button
                onClick={() => setShowAccusePicker(true)}
                className="text-xs text-gray-500 underline"
              >
                change
              </button>
            </div>
          )}

          {/* Show all accused numbers */}
          {allAccusedIds.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {[...new Set(allAccusedIds)].map((id) => {
                const p = playersList.find((pl) => pl.id === id);
                return (
                  <span key={id} className="rounded-full bg-red-900/50 px-3 py-1 text-sm text-red-300">
                    #{p?.index}
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex w-full gap-3">
            <button
              data-testid="discussion-finish-btn"
              onClick={finishSpeaking}
              className="flex-1 rounded-full bg-gray-700 py-3 text-sm font-semibold text-white transition-all active:scale-95 active:bg-gray-600"
            >
              Finish
            </button>
            {!myAccusation ? (
              <button
                onClick={() => setShowAccusePicker(true)}
                className="flex-1 rounded-full bg-red-700 py-3 text-sm font-semibold text-white transition-all active:scale-95 active:bg-red-800"
              >
                Accuse
              </button>
            ) : (
              <button
                onClick={() => setShowAccusePicker(true)}
                className="flex-1 rounded-full border border-red-700 py-3 text-sm font-semibold text-red-400 transition-all active:scale-95 active:bg-red-900/30"
              >
                Change Accusation
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
