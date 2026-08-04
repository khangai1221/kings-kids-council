import { z } from "zod";

export const reviewScoreInputSchema = z.object({
  rubricItemId: z.string().uuid(),
  score: z.coerce.number(),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const submitReviewSchema = z.object({
  submissionId: z.string().uuid(),
  recommendation: z.enum(["accept", "waitlist", "reject", "needs_discussion"]).optional(),
  privateComments: z.string().trim().max(5000).optional().or(z.literal("")),
  scores: z.array(reviewScoreInputSchema),
  submit: z.boolean().default(false),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
