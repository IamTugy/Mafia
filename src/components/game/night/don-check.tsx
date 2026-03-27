import { useClientStore } from '@/lib/store/client-store';
import { InvestigationPhase } from '../shared/investigation-phase';

export function DonCheck() {
  const history = useClientStore((s) => s.currentPlayerData?.investigationHistory ?? []);

  return (
    <InvestigationPhase
      role="don"
      testId="phase-donCheck"
      title="🎩 Don"
      titleColor="text-red-400"
      selectPrompt="Is this player the Sheriff?"
      formatResult={(result) =>
        result === 'sheriff'
          ? { label: '⭐ SHERIFF', color: 'text-yellow-300' }
          : { label: '✓ NOT SHERIFF', color: 'text-gray-300' }
      }
      extraDisabledIds={history}
      continueButtonColor="bg-red-700"
      continueButtonActiveColor="bg-red-800"
    />
  );
}
