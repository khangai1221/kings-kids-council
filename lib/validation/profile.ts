import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your full name.").max(100),
  gradeLevelId: z.string().uuid().optional().or(z.literal("")),
  schoolClassId: z.string().uuid().optional().or(z.literal("")),
  graduationYear: z.number().int().min(2000).max(2100).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
