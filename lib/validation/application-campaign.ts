import { z } from "zod";
import { CAMPAIGN_STATUSES } from "@/lib/constants";

export const campaignInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  academicYear: z.string().trim().max(20).optional().or(z.literal("")),
  openingAt: z.string().optional().or(z.literal("")),
  closingAt: z.string().optional().or(z.literal("")),
  eligibilityRequirements: z.string().trim().max(2000).optional().or(z.literal("")),
  eligibleGradeLevelIds: z.array(z.string().uuid()).optional(),
  formVersionId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(CAMPAIGN_STATUSES),
  confirmationMessage: z.string().trim().max(2000).optional().or(z.literal("")),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  allowReapply: z.boolean().default(false),
  blindReview: z.boolean().default(true),
  withdrawalDeadline: z.string().optional().or(z.literal("")),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;

export const positionInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  responsibilities: z.string().trim().max(2000).optional().or(z.literal("")),
  eligibility: z.string().trim().max(1000).optional().or(z.literal("")),
  maxSeats: z.coerce.number().int().positive().optional().nullable(),
  requiresInterview: z.boolean().default(false),
});

export type PositionInput = z.infer<typeof positionInputSchema>;
