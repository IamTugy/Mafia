import { cn } from '@/lib/utils';

// Night phase components
import { RoleReveal } from './night/role-reveal.tsx';
import { MafiaSetup } from './night/mafia-setup.tsx';
import { MafiaKill } from './night/mafia-kill.tsx';
import { SheriffCheck } from './night/sheriff-check.tsx';
import { DonCheck } from './night/don-check.tsx';

// Day phase components
import { DayStart } from './day/day-start.tsx';
import { Discussion } from './day/discussion.tsx';
import { Defense } from './day/defense.tsx';
import { FinalVote } from './day/final-vote.tsx';

// Other components
import { GameOver } from './game-over.tsx';
import { useClientStore } from '@/lib/store/client-store.ts';

export function Game() {
  const { gameState } = useClientStore();

  // Helper to get the appropriate component based on phase
  const getPhaseComponent = () => {
    switch (gameState.phase) {
      // Night stage
      case 'night.roleReveal':
        return <RoleReveal />;
      case 'night.mafiaSetup':
        return <MafiaSetup />;
      case 'night.mafiaKill':
        return <MafiaKill />;
      case 'night.sheriffCheck':
        return <SheriffCheck />;
      case 'night.donCheck':
        return <DonCheck />;

      // Day stage
      case 'day.start':
        return <DayStart />;
      case 'day.discussion':
        return <Discussion />;
      case 'day.defense':
        return <Defense />;
      case 'day.finalVote':
        return <FinalVote />;

      // End stage
      case 'ended':
        return <GameOver />;

      // Fallback
      default:
        return (
          <div className="flex h-full items-center justify-center">
            <p className="text-lg text-muted-foreground">Unknown game phase</p>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto flex h-full max-w-4xl flex-col gap-4 p-4">
      {/* Game stage indicator */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Stage:</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Phase:</span>
          <span className="font-semibold capitalize">{gameState.phase.split('.')[1] || gameState.phase}</span>
        </div>
      </div>

      {/* Main game content */}
      <div className={cn(
        "flex-1 rounded-lg border bg-card p-4 text-card-foreground shadow-sm",
      )}>
        {getPhaseComponent()}
      </div>
    </div>
  );
} 