import { useEffect, useState, useCallback } from 'react';
import { useClientStore } from '@/lib/store/client-store';
import { MAFIA_NUMBER_CALL_INTERVAL_MS, MAFIA_KILL_SLEEP_DELAY_MS, MAFIA_KILL_WAIT_AFTER_CALLS_MS } from '@/lib/consts';
import { speakSeatNumber } from '@/lib/audio/tts';

export function MafiaKill() {
  const { currentPlayerData, playersList, gameState, sendAction } = useClientStore();
  const [elapsed, setElapsed] = useState(0);
  const [showGun, setShowGun] = useState(false);

  const isMafia =
    currentPlayerData?.role === 'don' || currentPlayerData?.role === 'mafia';
  const myIndex = currentPlayerData?.index ?? 0;
  const myVote = currentPlayerData?.myKillVote ?? null;
  const phaseStartedAt = gameState.phaseStartedAt ?? Date.now();

  // Each player's device speaks their own seat number when their turn comes
  useEffect(() => {
    if (!myIndex) return;
    const aliveSeats = playersList
      .filter((p) => p.status === 'inGame')
      .map((p) => p.index)
      .filter((i): i is number => i != null)
      .sort((a, b) => a - b);

    const myPosition = aliveSeats.indexOf(myIndex);
    if (myPosition === -1) return;

    const delay = MAFIA_KILL_SLEEP_DELAY_MS + myPosition * MAFIA_NUMBER_CALL_INTERVAL_MS;
    const elapsedNow = Date.now() - phaseStartedAt;
    const remaining = delay - elapsedNow;

    if (remaining <= 0) {
      speakSeatNumber(myIndex);
      return;
    }
    const id = setTimeout(() => speakSeatNumber(myIndex), remaining);
    return () => clearTimeout(id);
  }, [myIndex, phaseStartedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick elapsed every 200ms
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - phaseStartedAt);
    }, 200);
    setElapsed(Date.now() - phaseStartedAt);
    return () => clearInterval(id);
  }, [phaseStartedAt]);

  // Compute countdown
  const aliveSeats = playersList
    .filter((p) => p.status === 'inGame')
    .map((p) => p.index)
    .filter((i): i is number => i != null)
    .sort((a, b) => a - b);

  const callDuration = aliveSeats.length * MAFIA_NUMBER_CALL_INTERVAL_MS;
  const totalPhaseMs = MAFIA_KILL_SLEEP_DELAY_MS + callDuration + MAFIA_KILL_WAIT_AFTER_CALLS_MS;
  const remainingMs = Math.max(0, totalPhaseMs - elapsed);
  const secondsLeft = Math.ceil(remainingMs / 1000);

  // Currently called seat
  const callingElapsed = elapsed - MAFIA_KILL_SLEEP_DELAY_MS;
  const callIndex = callingElapsed >= 0
    ? Math.min(Math.floor(callingElapsed / MAFIA_NUMBER_CALL_INTERVAL_MS), aliveSeats.length - 1)
    : -1;
  const currentCalledSeat = callIndex >= 0 ? (aliveSeats[callIndex] ?? null) : null;
  const currentCalledPlayer = currentCalledSeat
    ? playersList.find((p) => p.index === currentCalledSeat && p.status === 'inGame')
    : null;

  const isCalling = callingElapsed >= 0 && callIndex < aliveSeats.length;

  const handleTap = useCallback(() => {
    if (myVote || !isMafia || !currentCalledPlayer) return;
    sendAction({ type: 'kill', targetId: currentCalledPlayer.id });
    setShowGun(true);
    if (navigator.vibrate) navigator.vibrate(50);
  }, [myVote, isMafia, currentCalledPlayer, sendAction]);

  const hasVoted = !!myVote;

  return (
    <button
      data-testid="phase-mafiaKill"
      onClick={handleTap}
      disabled={!isMafia || hasVoted || !currentCalledPlayer}
      className={[
        'relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden',
        'select-none focus:outline-none transition-all duration-300',
        'bg-gray-950',
      ].join(' ')}
    >
      {/* Atmospheric glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-64 w-64 rounded-full bg-indigo-900/20 blur-3xl animate-slow-breathe" />
      </div>

      {/* Smoking gun shown after mafia tap */}
      {showGun && isMafia ? (
        <>
          <svg
            className="relative w-28 h-28 animate-fade-in-scale"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ transform: 'rotate(-35deg)' }}
          >
            {/* Smoke wisps */}
            <path d="M72 18 Q75 12 72 6 Q69 2 72 -2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7">
              <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2s" repeatCount="indefinite" />
              <animate attributeName="d" values="M72 18 Q75 12 72 6 Q69 2 72 -2;M72 18 Q78 10 74 4 Q70 0 74 -4;M72 18 Q75 12 72 6 Q69 2 72 -2" dur="2s" repeatCount="indefinite" />
            </path>
            <path d="M76 20 Q80 14 77 8 Q74 4 77 0" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5">
              <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="d" values="M76 20 Q80 14 77 8 Q74 4 77 0;M76 20 Q83 12 79 6 Q75 2 79 -2;M76 20 Q80 14 77 8 Q74 4 77 0" dur="2.5s" repeatCount="indefinite" />
            </path>
            {/* Barrel */}
            <rect x="60" y="38" width="30" height="8" rx="2" fill="#d1d5db" />
            {/* Barrel tip / muzzle */}
            <rect x="88" y="36" width="6" height="12" rx="1.5" fill="#9ca3af" />
            {/* Slide / upper receiver */}
            <rect x="42" y="38" width="46" height="8" rx="2" fill="#e5e7eb" />
            {/* Ejection port */}
            <rect x="56" y="39" width="12" height="5" rx="1" fill="#374151" />
            {/* Lower receiver / frame */}
            <path d="M42 46 L42 62 Q42 65 45 65 L62 65 L68 46 Z" fill="#d1d5db" />
            {/* Trigger guard */}
            <path d="M50 65 Q52 75 62 75 Q68 75 68 65" stroke="#9ca3af" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Trigger */}
            <line x1="59" y1="65" x2="61" y2="73" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
            {/* Grip */}
            <path d="M42 62 Q40 62 38 65 L34 80 Q33 84 36 85 L50 85 Q53 85 53 82 L53 65 Z" fill="#374151" />
            {/* Grip texture lines */}
            <line x1="37" y1="68" x2="50" y2="68" stroke="#4b5563" strokeWidth="1" opacity="0.6" />
            <line x1="36" y1="73" x2="50" y2="73" opacity="0.6" stroke="#4b5563" strokeWidth="1" />
            <line x1="35" y1="78" x2="49" y2="78" opacity="0.6" stroke="#4b5563" strokeWidth="1" />
            {/* Hammer */}
            <path d="M42 40 Q38 37 40 33 Q43 30 46 34 L46 40 Z" fill="#9ca3af" />
            {/* Front sight */}
            <rect x="85" y="34" width="3" height="5" rx="0.5" fill="#6b7280" />
            {/* Rear sight */}
            <rect x="58" y="35" width="6" height="4" rx="0.5" fill="#6b7280" />
          </svg>
          <p className="relative text-sm font-medium text-red-400/60 tracking-wide">
            Target locked
          </p>
        </>
      ) : (
        <>
          <p className="relative text-6xl animate-slow-breathe">🌙</p>
          <p className="relative text-lg font-medium text-gray-400 tracking-wide">
            Keep your eyes closed…
          </p>
        </>
      )}

      {/* Countdown visible to everyone */}
      {isCalling && (
        <p className="relative text-sm text-gray-700 mt-2">{secondsLeft}s</p>
      )}
    </button>
  );
}
