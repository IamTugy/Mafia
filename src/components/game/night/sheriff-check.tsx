import { InvestigationPhase } from '../shared/investigation-phase';

export function SheriffCheck() {
  return (
    <InvestigationPhase
      role="sheriff"
      testId="phase-sheriffCheck"
      title="⭐ Sheriff"
      titleColor="text-yellow-300"
      selectPrompt="Tap a player to investigate"
      formatResult={(result) =>
        result === 'mafia'
          ? { label: '🔴 MAFIA', color: 'text-red-400' }
          : { label: '🟢 VILLAGE', color: 'text-green-400' }
      }
      continueButtonColor="bg-yellow-600"
      continueButtonActiveColor="bg-yellow-700"
    />
  );
}
