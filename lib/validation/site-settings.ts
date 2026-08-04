import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid hex color, e.g. #193B75");

export const siteSettingsSchema = z.object({
  portalName: z.string().trim().min(2).max(100),
  schoolName: z.string().trim().min(2).max(100),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  primaryColor: hexColor,
  primaryColorDark: hexColor,
  accentColor: hexColor,
  successColor: hexColor,
  warningColor: hexColor,
  errorColor: hexColor,
  infoColor: hexColor,
  councilMission: z.string().trim().max(5000).optional().or(z.literal("")),
  privacyNotice: z.string().trim().max(20000).optional().or(z.literal("")),
  termsContent: z.string().trim().max(20000).optional().or(z.literal("")),
  minReportingPrivacyThreshold: z.coerce.number().int().min(1).max(50),
  fileUploadMaxSizeMb: z.coerce.number().int().min(1).max(100),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
