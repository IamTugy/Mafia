import { cn } from '@/lib/utils';

export interface NumberGridPlayer {
  id: string;
  index?: number | null;
  status?: string; // 'eliminated' = dead
}

interface NumberGridProps {
  players: NumberGridPlayer[];
  onSelect?: (playerId: string) => void;
  /** Player ID that is currently selected/voted */
  selectedId?: string | null;
  /** Player IDs that are disabled (can't be selected) */
  disabledIds?: string[];
  /** Player IDs shown with a red highlight (accused) */
  redIds?: string[];
  /** Player ID to exclude entirely (self) */
  excludeId?: string;
  className?: string;
}

/**
 * Reusable number grid used in investigation, kill vote, and accusation pickers.
 * Shows numbers in ascending seat-index order.
 * Dead players display a red ✕ and are non-interactive.
 */
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
              'relative flex h-16 w-full items-center justify-center rounded-xl border-2 text-2xl font-bold transition-colors',
              // Base
              !isDead && !isSelected && !isRed && !isDisabled &&
                'border-gray-600 bg-gray-800 text-white active:bg-gray-700',
              // Selected
              isSelected &&
                'border-blue-400 bg-blue-900/50 text-blue-200',
              // Accused / red highlight
              !isSelected && isRed && !isDead &&
                'border-red-500 bg-red-900/40 text-red-300',
              // Disabled (not dead)
              !isDead && isDisabled && !isSelected &&
                'border-gray-700 bg-gray-900 text-gray-600 opacity-60',
              // Dead
              isDead &&
                'border-gray-800 bg-gray-900/30 text-gray-700 opacity-40 cursor-not-allowed'
            )}
          >
            {p.index}
            {isDead && (
              <span className="absolute inset-0 flex items-center justify-center text-red-500 text-3xl font-black">
                ✕
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
