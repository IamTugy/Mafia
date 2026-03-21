import { z } from 'zod';

export const P2PWireMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join'), id: z.string(), name: z.string() }),
  z.object({ type: z.literal('rejoin'), originalId: z.string() }),
  z.object({ type: z.literal('leave'), id: z.string() }),
  z.object({ type: z.literal('action'), payload: z.unknown() }),
  z.object({ type: z.literal('stateUpdate'), state: z.unknown() }),
  z.object({ type: z.literal('hostLeft') }),
  z.object({ type: z.literal('becomeHost'), snapshot: z.unknown() }),
]);
export type P2PWireMessage = z.infer<typeof P2PWireMessageSchema>;
