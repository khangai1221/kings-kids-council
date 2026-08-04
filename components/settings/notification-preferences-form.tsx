"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { updateNotificationPreferences } from "@/actions/profile";

export function NotificationPreferencesForm({
  defaultInAppEnabled,
  defaultPushEnabled,
}: {
  defaultInAppEnabled: boolean;
  defaultPushEnabled: boolean;
}) {
  const [inApp, setInApp] = useState(defaultInAppEnabled);
  const [push, setPush] = useState(defaultPushEnabled);

  async function save(next: { inAppEnabled: boolean; pushEnabled: boolean }) {
    const result = await updateNotificationPreferences(next);
    if (!result.success) toast.error(result.error);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <Label htmlFor="pref-in-app" className="font-normal">In-app notifications</Label>
        <Switch
          id="pref-in-app"
          checked={inApp}
          onCheckedChange={(v) => {
            setInApp(v);
            void save({ inAppEnabled: v, pushEnabled: push });
          }}
        />
      </div>
      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <Label htmlFor="pref-push" className="font-normal">Browser push notifications</Label>
        <Switch
          id="pref-push"
          checked={push}
          onCheckedChange={(v) => {
            setPush(v);
            void save({ inAppEnabled: inApp, pushEnabled: v });
          }}
        />
      </div>
    </div>
  );
}
