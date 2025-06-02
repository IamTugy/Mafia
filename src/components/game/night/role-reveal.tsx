import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useClientStore } from '@/lib/store/client-store';

export function RoleReveal() {
  const { currentPlayerData } = useClientStore();

  if (!currentPlayerData) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg text-muted-foreground">Missing current player :/</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold">Role Reveal</h2>
          
          <div className="flex flex-col items-center gap-4">
            <Card 
              className={cn(
                "relative h-64 w-48 cursor-pointer overflow-hidden transition-all hover:scale-105",
              )}
            >
              
                <>
                  <img 
                    src={currentPlayerData.characterImage} 
                    alt={`${currentPlayerData.role} character`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                    <p className="text-2xl font-bold capitalize">{currentPlayerData.role}</p>
                    <p className="text-sm">Player {currentPlayerData.index}</p>
                  </div>
                </>
            </Card>




          </div>
        </div>
      </Card>
    </div>
  );
} 