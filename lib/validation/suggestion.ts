import { z } from "zod";

export const submitSuggestionSchema = z.object({
  categoryId: z.string().uuid().optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Enter a subject.").max(200),
  message: z.string().trim().min(10, "Tell us more — at least 10 characters.").max(5000),
  proposedSolution: z.string().trim().max(2000).optional().or(z.literal("")),
  identityMode: z.enum(["identified", "anonymous_to_council"]),
});

export type SubmitSuggestionInput = z.infer<typeof submitSuggestionSchema>;
