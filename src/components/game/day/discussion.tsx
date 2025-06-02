import { Card } from '@/components/ui/Card';
import { useClientStore } from '@/lib/store/client-store';

export function Discussion() {
  const { 
    gameState: {day}
  } = useClientStore();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <Card className="w-full max-w-md p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold">Day {day} Discussion</h2>
        </div>
      </Card>
    </div>
  );
} 