import { useEffect, useState } from 'react';
import { useClientStore } from '@/lib/store/client-store';
import { MAFIA_NUMBER_CALL_INTERVAL_MS, MAFIA_KILL_SLEEP_DELAY_MS } from '@/lib/consts';
import { speakSeatNumber } from '@/lib/audio/tts';

export function MafiaKill() {
  const { currentPlayerData, playersList, gameState, sendAction } = useClientStore();
  const [elapsed, setElapsed] = useState(0);

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

    // MAFIA_KILL_SLEEP_DELAY_MS gives narration time to finish before numbers start
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

  // Tick elapsed every 200ms for mafia view
  useEffect(() => {
    if (!isMafia) return;
    const id = setInterval(() => {
      setElapsed(Date.now() - phaseStartedAt);
    }, 200);
    setElapsed(Date.now() - phaseStartedAt);
    return () => clearInterval(id);
  }, [isMafia, phaseStartedAt]);

  if (!isMafia) {
    return (
      <div data-testid="phase-mafiaKill" className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gray-950">
        <p className="text-5xl">😴</p>
        <p className="text-lg text-gray-500">Keep your eyes closed…</p>
      </div>
    );
  }

  const aliveSeats = playersList
    .filter((p) => p.status === 'inGame')
    .map((p) => p.index)
    .filter((i): i is number => i != null)
    .sort((a, b) => a - b);

  const callIndex = Math.floor(Math.max(0, elapsed - MAFIA_KILL_SLEEP_DELAY_MS) / MAFIA_NUMBER_CALL_INTERVAL_MS);
  const currentCalledSeat = aliveSeats[callIndex] ?? null;
  const currentCalledPlayer = currentCalledSeat
    ? playersList.find((p) => p.index === currentCalledSeat && p.status === 'inGame')
    : null;

  const handleTap = () => {
    if (myVote || !currentCalledPlayer) return;
    sendAction({ type: 'kill', targetId: currentCalledPlayer.id });
  };

  if (myVote) {
    const votedPlayer = playersList.find((p) => p.id === myVote);
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gray-950 p-6">
        <p className="text-gray-400 text-sm">You eliminated</p>
        <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-red-600 bg-gray-900">
          <span className="text-5xl font-bold text-white">{votedPlayer?.index ?? '?'}</span>
        </div>
        <p className="text-xs text-gray-600">Waiting for other Mafia members…</p>
      </div>
    );
  }

  return (
    <button
      data-testid="phase-mafiaKill"
      className="flex h-full w-full flex-col items-center justify-center bg-gray-950 select-none focus:outline-none"
      onClick={handleTap}
      disabled={!currentCalledSeat}
    >
      {currentCalledSeat ? (
        <>
          {/* Pulsing seat number */}
          <p
            className="font-black text-red-400 leading-none animate-pulse"
            style={{ fontSize: 'min(45vw, 240px)' }}
          >
            {currentCalledSeat}
          </p>
          <p className="mt-6 text-xl font-bold text-white tracking-widest uppercase">
            TAP TO SHOOT
          </p>
          <p className="mt-2 text-xs text-gray-600">Tap anywhere to eliminate this player</p>
        </>
      ) : (
        <p className="text-lg text-gray-500">Waiting…</p>
      )}
    </button>
  );
}
