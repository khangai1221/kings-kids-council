"use client";

import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFcmToken } from "@/hooks/use-fcm-token";

export function PushNotificationToggle() {
  const { permission, isConfigured, isRegistering, enablePush } = useFcmToken();

  if (!isConfigured) {
    return (
      <p className="text-sm text-muted-foreground">
        Push notifications are not configured for this deployment yet.
      </p>
    );
  }

  if (permission === "unsupported") {
    return <p className="text-sm text-muted-foreground">Your browser does not support push notifications.</p>;
  }

  if (permission === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        Notifications are blocked in your browser settings. Enable them in your browser&apos;s site settings to
        receive push notifications.
      </p>
    );
  }

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <BellRing className="size-4" /> Push notifications are enabled on this device.
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" className="gap-2" onClick={enablePush} disabled={isRegistering}>
      <BellRing className="size-4" />
      {isRegistering ? "Requesting permission…" : "Enable push notifications"}
    </Button>
  );
}
