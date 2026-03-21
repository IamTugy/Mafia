interface ToolbarProps {
  count: number;
  onCountChange: (count: number) => void;
  onRefreshAll: () => void;
  onResetLayout: () => void;
}

export function Toolbar({ count, onCountChange, onRefreshAll, onResetLayout }: ToolbarProps) {
  return (
    <div className="flex items-center gap-4 border-b border-white/10 bg-gray-900 px-4 py-2">
      <span className="text-sm font-semibold text-gray-300">Mafia Simulator</span>

      <div className="flex items-center gap-2">
        <label htmlFor="phone-count" className="text-xs text-gray-400">
          Phones
        </label>
        <select
          id="phone-count"
          value={count}
          onChange={(e) => onCountChange(Number(e.target.value))}
          className="rounded border border-white/10 bg-gray-800 px-2 py-1 text-sm text-white"
        >
          {[5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onRefreshAll}
        className="rounded bg-gray-700 px-3 py-1 text-xs text-white hover:bg-gray-600"
      >
        Refresh All
      </button>

      <button
        onClick={onResetLayout}
        className="rounded bg-gray-700 px-3 py-1 text-xs text-white hover:bg-gray-600"
      >
        Reset Layout
      </button>
    </div>
  );
}
