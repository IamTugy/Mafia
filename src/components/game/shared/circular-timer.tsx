import { cn } from '@/lib/utils';

interface CircularTimerProps {
  secondsLeft: number;
  progress: number;
  size?: number;
  color?: string;
  urgentColor?: string;
  trackColor?: string;
  strokeWidth?: number;
  textSize?: string;
  className?: string;
}

export function CircularTimer({
  secondsLeft,
  progress,
  size = 140,
  color = '#3b82f6',
  urgentColor = '#ef4444',
  trackColor = '#1f2937',
  strokeWidth = 8,
  textSize = 'text-5xl',
  className,
}: CircularTimerProps) {
  const center = size / 2;
  const radius = center - strokeWidth * 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const isUrgent = secondsLeft <= 10;
  const activeColor = isUrgent ? urgentColor : color;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        isUrgent && 'animate-urgent-pulse',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={center} cy={center} r={radius}
          stroke={trackColor} strokeWidth={strokeWidth} fill="none"
        />
        <circle
          cx={center} cy={center} r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-200"
        />
      </svg>
      <p className={cn(
        'relative font-black text-white transition-colors duration-300',
        textSize,
        isUrgent && 'text-red-400'
      )}>
        {secondsLeft}
      </p>
    </div>
  );
}
