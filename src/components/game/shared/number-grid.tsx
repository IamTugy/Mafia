import { cn } from '@/lib/utils';

export interface NumberGridPlayer {
  id: string;
  index?: number | null;
  status?: string;
}

interface NumberGridProps {
  players: NumberGridPlayer[];
  onSelect?: (playerId: string) => void;
  selectedId?: string | null;
  disabledIds?: string[];
  redIds?: string[];
  excludeId?: string;
  className?: string;
}

export function NumberGrid({
  players,
  onSelect,
  selectedId,
  disabledIds = [],
  redIds = [],
  excludeId,
  className,
}: NumberGridProps) {
  const sorted = [...players]
    .filter((p) => p.id !== excludeId && p.index != null)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  return (
    <div className={cn('grid grid-cols-4 gap-3', className)}>
      {sorted.map((p) => {
        const isDead = p.status === 'eliminated';
        const isSelected = selectedId === p.id;
        const isDisabled = isDead || disabledIds.includes(p.id);
        const isRed = redIds.includes(p.id);

        return (
          <button
            key={p.id}
            data-testid={`number-grid-btn-${p.id}`}
            onClick={() => !isDisabled && onSelect?.(p.id)}
            disabled={isDisabled}
            className={cn(
              'relative flex h-16 w-full items-center justify-center rounded-xl border-2 text-2xl font-bold transition-all duration-150',
              // Base - interactive
              !isDead && !isSelected && !isRed && !isDisabled &&
                'border-gray-600 bg-gray-800/80 text-white active:scale-95 active:bg-gray-700',
              // Selected
              isSelected &&
                'border-blue-400 bg-blue-900/50 text-blue-200 shadow-md shadow-blue-900/30 scale-105',
              // Accused / red highlight
              !isSelected && isRed && !isDead &&
                'border-red-500/80 bg-red-900/30 text-red-300 active:scale-95',
              // Disabled (not dead)
              !isDead && isDisabled && !isSelected &&
                'border-gray-800 bg-gray-900/50 text-gray-700 opacity-50',
              // Dead
              isDead &&
                'border-gray-800/50 bg-gray-900/20 text-gray-800 opacity-30 cursor-not-allowed'
            )}
          >
            {p.index}
            {isDead && (
              <span className="absolute inset-0 flex items-center justify-center text-red-500/60 text-3xl font-black">
                ✕
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
