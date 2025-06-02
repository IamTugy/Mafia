import { Card } from '@/components/ui/Card';
import { useClientStore } from '@/lib/store/client-store';

export function DayStart() {
  const { 
    gameState: {day}
  } = useClientStore();

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-md p-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-semibold">Day {day} Begins</h2>
        </div>
      </Card>
    </div>
  );
} 