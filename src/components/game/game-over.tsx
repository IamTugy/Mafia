import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export function GameOver() {
  const winner = 'mafia';
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <Card className="w-full max-w-md p-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-semibold">Game Over</h2>
          
          <div className="flex flex-col items-center gap-2">
            <p className={cn(
              "text-xl font-semibold",
              winner === 'mafia' ? "text-destructive" : "text-primary"
            )}>
              {winner === 'mafia' ? 'Mafia Wins!' : 'Civilians Win!'}
            </p>
            <p className="text-sm text-muted-foreground">
              {winner === 'mafia' 
                ? 'The mafia successfully eliminated all civilians'
                : 'The civilians successfully eliminated all mafia members'
              }
            </p>
          </div>

          
        </div>
      </Card>
    </div>
  );
} 