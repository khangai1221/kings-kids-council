"use client";

import { useState, type ChangeEvent } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateSiteSettings, uploadPortalLogo } from "@/actions/settings";
import type { SiteSettingsInput } from "@/lib/validation/site-settings";
import type { SiteSettings } from "@/lib/settings/service";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState(settings.portal_logo_url);
  const [form, setForm] = useState<SiteSettingsInput>({
    portalName: settings.portal_name,
    schoolName: settings.school_name,
    contactEmail: settings.contact_email ?? "",
    primaryColor: settings.primary_color,
    primaryColorDark: settings.primary_color_dark,
    accentColor: settings.accent_color,
    successColor: settings.success_color,
    warningColor: settings.warning_color,
    errorColor: settings.error_color,
    infoColor: settings.info_color,
    councilMission: settings.council_mission ?? "",
    privacyNotice: settings.privacy_notice ?? "",
    termsContent: settings.terms_content ?? "",
    minReportingPrivacyThreshold: settings.min_reporting_privacy_threshold,
    fileUploadMaxSizeMb: Math.round(settings.file_upload_max_size_bytes / 1024 / 1024),
  });

  function set<K extends keyof SiteSettingsInput>(key: K, value: SiteSettingsInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setIsSubmitting(true);
    const result = await updateSiteSettings(form);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved.");
  }

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadPortalLogo(formData);
    setIsUploadingLogo(false);
    e.target.value = "";
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setLogoUrl(result.data.url);
    toast.success("Logo updated.");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & files</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="space-y-1.5"><Label>Portal name</Label><Input value={form.portalName} onChange={(e) => set("portalName", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>School name</Label><Input value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Contact email</Label><Input value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} /></div>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <div className="space-y-1.5">
            <Label>Portal logo</Label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <Image src={logoUrl} alt="" width={48} height={48} className="size-12 rounded-md border border-border object-contain" />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                  None
                </div>
              )}
              <Input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={isUploadingLogo} onChange={handleLogoChange} className="max-w-xs" />
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPEG, WebP, or SVG. Max 2MB. Replaces the header logo shown throughout the portal.</p>
          </div>
          {([
            ["primaryColor", "Primary color"],
            ["primaryColorDark", "Primary color (dark)"],
            ["accentColor", "Accent color"],
            ["successColor", "Success color"],
            ["warningColor", "Warning color"],
            ["errorColor", "Error color"],
            ["infoColor", "Info color"],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <Label className="w-40">{label}</Label>
              <input type="color" value={form[key]} onChange={(e) => set(key, e.target.value)} className="h-9 w-12 rounded border border-input" />
              <Input value={form[key]} onChange={(e) => set(key, e.target.value)} className="w-32" />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="space-y-1.5"><Label>Council mission (Markdown)</Label><Textarea rows={4} value={form.councilMission} onChange={(e) => set("councilMission", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Privacy notice (Markdown)</Label><Textarea rows={6} value={form.privacyNotice} onChange={(e) => set("privacyNotice", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Terms / portal rules (Markdown)</Label><Textarea rows={6} value={form.termsContent} onChange={(e) => set("termsContent", e.target.value)} /></div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <div className="space-y-1.5">
            <Label>Minimum group size for reporting subgroups</Label>
            <Input type="number" value={form.minReportingPrivacyThreshold} onChange={(e) => set("minReportingPrivacyThreshold", Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Subgroup statistics smaller than this are hidden to protect student privacy.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Max file upload size (MB)</Label>
            <Input type="number" value={form.fileUploadMaxSizeMb} onChange={(e) => set("fileUploadMaxSizeMb", Number(e.target.value))} />
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save settings"}</Button>
    </div>
  );
}
