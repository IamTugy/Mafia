import { useState, useRef } from 'react';
import { useClientStore } from '@/lib/store/client-store';
import { ROLE_REVEAL_HOLD_MS } from '@/lib/consts';

/** Two back-to-back pistols SVG for the card back. */
function CardBackSVG() {
  // Single pistol path facing right, then mirrored
  const pistol = (
    <g fill="currentColor">
      {/* Barrel */}
      <rect x="18" y="14" width="26" height="7" rx="2" />
      {/* Slide / upper body */}
      <rect x="10" y="18" width="28" height="11" rx="2" />
      {/* Frame lower */}
      <rect x="10" y="27" width="18" height="5" rx="1" />
      {/* Handle */}
      <path d="M10 32 Q9 38 11 44 L20 44 L22 32 Z" />
      {/* Trigger guard */}
      <path d="M18 32 Q23 38 28 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Trigger */}
      <rect x="21" y="30" width="2.5" height="6" rx="1" />
      {/* Hammer */}
      <rect x="8" y="17" width="5" height="9" rx="1.5" />
      {/* Muzzle cap */}
      <rect x="44" y="15" width="4" height="5" rx="1" />
    </g>
  );

  return (
    <svg
      viewBox="0 0 100 60"
      className="w-28 text-gray-400 opacity-70"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pistol facing right */}
      <g transform="translate(2, 5)">{pistol}</g>
      {/* Pistol facing left (mirrored horizontally around centre) */}
      <g transform="translate(98, 55) rotate(180)">{pistol}</g>
    </svg>
  );
}

export function RoleReveal() {
  const { currentPlayerData, gameState, playersList, sendAction } = useClientStore();
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);

  const readyCount = gameState.readyPlayers?.length ?? 0;

  const onPressStart = () => {
    if (isHoldingRef.current) return;
    isHoldingRef.current = true;
    holdTimerRef.current = setTimeout(() => {
      setIsFlipped(true);
      setHasViewed(true);
    }, ROLE_REVEAL_HOLD_MS);
  };

  const onPressEnd = () => {
    isHoldingRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsFlipped(false);
  };

  const markReady = () => {
    setIsReady(true);
    sendAction({ type: 'ready' });
  };

  if (!currentPlayerData) return null;

  const roleLabel = currentPlayerData.role
    ? currentPlayerData.role.charAt(0).toUpperCase() + currentPlayerData.role.slice(1)
    : '?';

  const roleColors: Record<string, string> = {
    don: 'text-red-400',
    mafia: 'text-red-300',
    sheriff: 'text-yellow-300',
    civilian: 'text-blue-300',
  };
  const roleColor = roleColors[currentPlayerData.role ?? ''] ?? 'text-white';

  return (
    <div data-testid="phase-roleReveal" className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gray-950 p-6 select-none">
      <p className="text-sm font-medium text-gray-400">Press and hold the card to see your role</p>

      {/* 3D flip card */}
      <div
        data-testid="role-reveal-card"
        className="relative touch-none"
        style={{ perspective: '900px', width: 200, height: 290 }}
        onPointerDown={onPressStart}
        onPointerUp={onPressEnd}
        onPointerLeave={onPressEnd}
        onPointerCancel={onPressEnd}
      >
        <div
          className="relative h-full w-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Card back */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-gray-700 bg-gray-900"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            {/* Decorative border */}
            <div className="absolute inset-2 rounded-xl border border-gray-700/50" />
            <div className="absolute inset-4 rounded-lg border border-gray-700/30" />
            <CardBackSVG />
            <p className="text-xs text-gray-600 tracking-widest uppercase">Hold to reveal</p>
          </div>

          {/* Card front */}
          <div
            className="absolute inset-0 overflow-hidden rounded-2xl border-2 border-gray-600"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {currentPlayerData.characterImage ? (
              <img
                src={currentPlayerData.characterImage}
                alt={roleLabel}
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-800" />
            )}
            <div className="absolute inset-0 flex flex-col items-end justify-end bg-gradient-to-t from-black/80 to-transparent p-3">
              <p className={`text-xl font-bold ${roleColor}`}>{roleLabel}</p>
              <p className="text-xs text-gray-300">Seat #{currentPlayerData.index}</p>
            </div>
          </div>
        </div>
      </div>

      {hasViewed && !isReady && (
        <button
          data-testid="role-reveal-ready-btn"
          onClick={markReady}
          className="mt-2 w-48 rounded-full bg-green-600 py-3 text-sm font-semibold text-white active:bg-green-700"
        >
          Ready
        </button>
      )}

      {isReady && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-green-400">Waiting for others… ({readyCount} ready)</p>
          <div className="flex flex-wrap justify-center gap-1">
            {[...playersList]
              .filter((p) => p.status === 'inGame' && p.index != null)
              .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
              .map((p) => {
                const ready = gameState.readyPlayers?.includes(p.id) ?? false;
                return (
                  <div
                    key={p.id}
                    className={[
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2',
                      ready
                        ? 'border-green-500 bg-green-900/50 text-green-300'
                        : 'border-gray-700 bg-gray-900 text-gray-500',
                    ].join(' ')}
                  >
                    {p.index}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
