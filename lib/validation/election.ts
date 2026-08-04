import { z } from "zod";

export const castVoteSchema = z.object({
  electionId: z.string().uuid(),
  ballot: z.array(
    z.object({
      position_id: z.string().uuid(),
      candidate_ids: z.array(z.string().uuid()),
    }),
  ),
});

export type CastVoteInput = z.infer<typeof castVoteSchema>;
