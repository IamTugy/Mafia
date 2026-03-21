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
        initializeClient(host.id, playerName);
      });
    } else if (gameCode) {
      initializeClient(gameCode, playerName);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
