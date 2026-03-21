import { useState, useEffect, useRef } from 'react';
import { useClientStore } from '@/lib/store/client-store';
import { FINAL_VOTE_TIME_SECONDS } from '@/lib/consts';
import { getAccusedList } from '@/lib/store/types';
import { playDing } from '@/lib/audio/tts';

export function FinalVote() {
  const { gameState, currentPlayerData, playersList, sendAction } = useClientStore();
  const [localVote, setLocalVote] = useState<string | null>(currentPlayerData?.myVote ?? null);
  const [, forceUpdate] = useState(0);

  const accusedList = getAccusedList(gameState);
  const readyPlayers = gameState.readyPlayers ?? [];
  const alivePlayers = playersList.filter((p) => p.status === 'inGame');
  const voteOpenAt = gameState.voteOpenAt;
  const voteCount = gameState.voteCount ?? 0;

  const myId = currentPlayerData?.id;
  const isReady = myId ? readyPlayers.includes(myId) : false;
  const allReady = alivePlayers.every((p) => readyPlayers.includes(p.id));

  const votingIsOpen = voteOpenAt != null && Date.now() >= voteOpenAt;

  const dingFiredRef = useRef(false);

  // Tick every 200ms to update live countdown while voting is open; ding when it expires
  useEffect(() => {
    if (!votingIsOpen || !voteOpenAt) return;
    dingFiredRef.current = false;
    const id = setInterval(() => {
      forceUpdate((n) => n + 1);
      const remaining = voteOpenAt + FINAL_VOTE_TIME_SECONDS * 1000 - Date.now();
      if (remaining <= 0 && !dingFiredRef.current) {
        dingFiredRef.current = true;
        playDing();
      }
    }, 200);
    return () => clearInterval(id);
  }, [votingIsOpen, voteOpenAt]);

  const markReady = () => sendAction({ type: 'ready' });

  const castVote = (targetId: string) => {
    if (localVote) return;
    setLocalVote(targetId);
    sendAction({ type: 'vote', targetId });
  };

  // ── Ready gate ─────────────────────────────────────────────────────────
  if (!allReady || !voteOpenAt) {
    return (
      <div data-testid="phase-finalVote" className="flex h-full w-full flex-col items-center justify-between bg-gray-950 p-6 pt-10 pb-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xl font-bold text-white">Raise your phones</p>
          <p className="text-sm text-gray-400">Press Ready when prepared to vote</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-500">
            {readyPlayers.length} / {alivePlayers.length} ready
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[...alivePlayers]
              .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
              .map((p) => (
                <div
                  key={p.id}
                  className={[
                    'flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold border-2',
                    readyPlayers.includes(p.id)
                      ? 'border-green-500 bg-green-900/40 text-green-400'
                      : 'border-gray-700 bg-gray-900 text-gray-500',
                  ].join(' ')}
                >
                  {p.index}
                </div>
              ))}
          </div>
        </div>

        {!isReady ? (
          <button
            data-testid="final-vote-ready-btn"
            onClick={markReady}
            className="w-48 rounded-full bg-green-600 py-3 text-sm font-semibold text-white active:bg-green-700"
          >
            Ready
          </button>
        ) : (
          <p className="text-sm text-gray-500">Waiting for others…</p>
        )}
      </div>
    );
  }

  // ── Voted confirmation ──────────────────────────────────────────────────
  if (localVote) {
    const votedPlayer = playersList.find((p) => p.id === localVote);
    const secondsLeft = Math.max(
      0,
      Math.ceil((voteOpenAt + FINAL_VOTE_TIME_SECONDS * 1000 - Date.now()) / 1000)
    );
    return (
      <div data-testid="phase-finalVote" className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gray-950 p-6">
        <p className="text-sm text-gray-400">You voted for</p>
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-red-600 bg-gray-900">
          <span className="text-4xl font-bold text-white">{votedPlayer?.index ?? '?'}</span>
        </div>
        <p className="text-sm text-gray-500">
          {voteCount} / {alivePlayers.length} voted
        </p>
        <p className="text-sm font-semibold text-red-400">{secondsLeft}s remaining</p>
      </div>
    );
  }

  // ── Vote buttons (voting open) ──────────────────────────────────────────
  const lastAccused = accusedList.at(-1);
  const secondsLeft = Math.max(
    0,
    Math.ceil((voteOpenAt + FINAL_VOTE_TIME_SECONDS * 1000 - Date.now()) / 1000)
  );

  return (
    <div data-testid="phase-finalVote" className="flex h-full w-full flex-col items-center gap-6 bg-gray-950 p-6 pt-10">
      <p className="text-xl font-bold text-white">Vote to eliminate</p>

      {/* Live countdown */}
      <p className="text-2xl font-black text-red-400">{secondsLeft}s</p>

      {lastAccused && (
        <p className="text-xs text-gray-500">
          No vote = auto-vote for #{playersList.find((p) => p.id === lastAccused)?.index}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 w-full">
        {accusedList.map((id) => {
          const p = playersList.find((pl) => pl.id === id);
          return (
            <button
              key={id}
              data-testid={`vote-btn-${id}`}
              onClick={() => castVote(id)}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-gray-600 bg-gray-800 py-6 gap-1 text-white active:bg-red-900 active:border-red-600"
            >
              <span className="text-4xl font-black">#{p?.index ?? '?'}</span>
              <span className="text-xs text-gray-400">{p?.name ?? ''}</span>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-gray-500">
        {voteCount} / {alivePlayers.length} voted
      </p>
    </div>
  );
}
