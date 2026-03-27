interface SleepScreenProps {
  testId: string;
  secondsLeft?: number;
}

/**
 * "Keep your eyes closed" screen shown to non-active players during night phases.
 * Features a breathing moon animation for atmosphere.
 */
export function SleepScreen({ testId, secondsLeft }: SleepScreenProps) {
  return (
    <div
      data-testid={testId}
      className="relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden bg-gray-950"
    >
      {/* Subtle radial glow behind the moon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-64 w-64 rounded-full bg-indigo-900/20 blur-3xl animate-slow-breathe" />
      </div>

      <p className="relative text-6xl animate-slow-breathe">🌙</p>
      <p className="relative text-lg font-medium text-gray-400 tracking-wide">
        Keep your eyes closed…
      </p>
      {secondsLeft != null && (
        <p className="relative text-sm text-gray-700">{secondsLeft}s</p>
      )}
    </div>
  );
}
