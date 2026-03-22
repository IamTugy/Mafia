interface ToolbarProps {
  count: number;
  onCountChange: (count: number) => void;
  onRefreshAll: () => void;
  onResetLayout: () => void;
  mirrorClicks: boolean;
  onMirrorClicksChange: (enabled: boolean) => void;
}

export function Toolbar({ count, onCountChange, onRefreshAll, onResetLayout, mirrorClicks, onMirrorClicksChange }: ToolbarProps) {
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

      <label className="ml-auto flex cursor-pointer items-center gap-2">
        <span className="text-xs text-gray-400">Mirror Clicks</span>
        <div
          role="switch"
          aria-checked={mirrorClicks}
          onClick={() => onMirrorClicksChange(!mirrorClicks)}
          className={`relative h-5 w-9 rounded-full transition-colors ${mirrorClicks ? 'bg-blue-500' : 'bg-gray-600'}`}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${mirrorClicks ? 'translate-x-4' : 'translate-x-0.5'}`}
          />
        </div>
      </label>
    </div>
  );
}
