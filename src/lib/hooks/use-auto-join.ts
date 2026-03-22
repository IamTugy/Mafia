import { useEffect, useRef } from 'react';
import { useServerStore } from '@/lib/store/server-store';
import { useClientStore } from '@/lib/store/client-store';

export function useAutoJoin() {
  const initializeHost = useServerStore((state) => state.initializeHost);
  const initializeClient = useClientStore((state) => state.initializeClient);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const gameCode = params.get('gameCode');
    const playerName = params.get('playerName');
    const isHost = params.get('host') === 'true';

    if (!playerName) return;

    if (isHost) {
      initializeHost().then((host) => {
        // skipRejoin=true: iframes share sessionStorage, so always do a fresh join
        initializeClient(host.id, playerName, true);
        // Notify parent frame (simulator) of the game code so other phones can join
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'mafia:game-code', code: host.id }, '*');
        }
      });
    } else if (gameCode) {
      // skipRejoin=true: same reason — bypass stale sessionStorage from other iframes
      initializeClient(gameCode, playerName, true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
