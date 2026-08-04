import { z } from "zod";

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your full name.").max(100),
  gradeLevelId: z.string().uuid("Select your grade."),
  schoolClassId: z.string().uuid().optional().or(z.literal("")),
  graduationYear: z.number().int().min(2000).max(2100).optional(),
  notificationInAppEnabled: z.boolean(),
  notificationPushEnabled: z.boolean(),
  acceptedRules: z.boolean().refine((v) => v === true, { message: "You must accept the portal rules to continue." }),
  acceptedPrivacy: z
    .boolean()
    .refine((v) => v === true, { message: "You must accept the privacy notice to continue." }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
