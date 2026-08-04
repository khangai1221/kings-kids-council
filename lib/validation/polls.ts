import { z } from "zod";
import { POLL_STATUSES } from "@/lib/constants";

export const pollInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(10),
  opensAt: z.string().optional().or(z.literal("")),
  closesAt: z.string().optional().or(z.literal("")),
  eligibleGradeLevelIds: z.array(z.string().uuid()).optional(),
  status: z.enum(POLL_STATUSES),
});

export type PollInput = z.infer<typeof pollInputSchema>;
