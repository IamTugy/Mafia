import { useEffect, useRef } from 'react';
import { useServerStore } from '@/lib/store/server-store';
import { useClientStore } from '@/lib/store/client-store';
import { clearRejoinInfo } from '@/lib/p2p/client';

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

    // Clear any stale rejoin info — iframes on the same origin share sessionStorage,
    // so without this every iframe would rejoin as whatever peer last stored its info.
    clearRejoinInfo();

    if (isHost) {
      initializeHost().then((host) => {
        initializeClient(host.id, playerName);
        // Notify parent frame (simulator) of the game code so other phones can join
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'mafia:game-code', code: host.id }, '*');
        }
      });
    } else if (gameCode) {
      initializeClient(gameCode, playerName);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
