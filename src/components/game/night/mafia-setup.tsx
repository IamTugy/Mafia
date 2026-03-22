import { useState } from 'react';
import { useClientStore } from '@/lib/store/client-store';
import { useCountdown } from '@/lib/hooks/use-countdown';
import { MAFIA_SETUP_TIMEOUT_MS } from '@/lib/consts';

export function MafiaSetup() {
  const { currentPlayerData, gameState, sendAction } = useClientStore();
  const [done, setDone] = useState(false);

  const ismafia =
    currentPlayerData?.role === 'don' || currentPlayerData?.role === 'mafia';

  const { secondsLeft } = useCountdown({
    durationSeconds: MAFIA_SETUP_TIMEOUT_MS / 1000,
    startedAt: gameState.phaseStartedAt,
  });

  // Roles are private per client — mafia members recognise each other at the table.
  // This screen just confirms their own role and lets them signal Done.

  const handleDone = () => {
    setDone(true);
    sendAction({ type: 'ready' });
  };

  if (!ismafia) {
    // Non-mafia: sleeping screen
    return (
      <div data-testid="phase-mafiaSetup" className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gray-950">
        <p className="text-5xl">😴</p>
        <p className="text-lg text-gray-500">Keep your eyes closed…</p>
        <p className="text-sm text-gray-700">{secondsLeft}s</p>
      </div>
    );
  }

  return (
    <div data-testid="phase-mafiaSetup" className="flex h-full w-full flex-col items-center justify-center gap-8 bg-gray-950 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-3xl font-bold text-red-400">
          {currentPlayerData?.role === 'don' ? '🎩 You are the Don' : '🔪 You are Mafia'}
        </p>
        <p className="text-sm text-gray-400">
          Seat #{currentPlayerData?.index}
        </p>
        <p className="text-xs text-gray-600">{secondsLeft}s remaining</p>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-6 text-center">
        <p className="text-gray-300 text-sm leading-relaxed">
          Open your eyes. Look around and recognise your fellow Mafia members.
          {currentPlayerData?.role === 'don' && (
            <span className="mt-2 block text-yellow-400">
              As the Don, you also have the ability to investigate one player each night.
            </span>
          )}
        </p>
      </div>

      {!done ? (
        <button
          data-testid="mafia-setup-done-btn"
          onClick={handleDone}
          className="w-48 rounded-full bg-red-700 py-3 text-sm font-semibold text-white active:bg-red-800"
        >
          Done
        </button>
      ) : (
        <p className="text-sm text-gray-500">Waiting for other Mafia members…</p>
      )}
    </div>
  );
}
