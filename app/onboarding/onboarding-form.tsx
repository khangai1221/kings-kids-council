"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { completeOnboarding } from "@/actions/onboarding";
import { onboardingSchema, type OnboardingInput } from "@/lib/validation/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GradeLevelRow, SchoolClassRow } from "@/types/database";

interface OnboardingFormProps {
  schoolEmail: string;
  defaultDisplayName: string;
  gradeLevels: GradeLevelRow[];
  schoolClasses: SchoolClassRow[];
}

export function OnboardingForm({ schoolEmail, defaultDisplayName, gradeLevels, schoolClasses }: OnboardingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: defaultDisplayName,
      gradeLevelId: "",
      schoolClassId: "",
      graduationYear: undefined,
      notificationInAppEnabled: true,
      notificationPushEnabled: true,
      acceptedRules: false,
      acceptedPrivacy: false,
    },
  });

  const selectedGrade = form.watch("gradeLevelId");
  const visibleClasses = schoolClasses.filter(
    (schoolClass) => !schoolClass.grade_level_id || schoolClass.grade_level_id === selectedGrade,
  );

  async function onSubmit(values: OnboardingInput) {
    setIsSubmitting(true);
    const result = await completeOnboarding(values);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        <div>
          <FormLabel htmlFor="school-email">School email</FormLabel>
          <Input id="school-email" value={schoolEmail} disabled readOnly className="mt-1.5" />
        </div>

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Anujin G." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gradeLevelId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grade</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your grade" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {gradeLevels.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="schoolClassId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class / homeroom (optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!selectedGrade}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={selectedGrade ? "Select your class" : "Select a grade first"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {visibleClasses.map((schoolClass) => (
                    <SelectItem key={schoolClass.id} value={schoolClass.id}>
                      {schoolClass.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="graduationYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Graduation year (optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 2028"
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">Notifications</p>
          <FormField
            control={form.control}
            name="notificationInAppEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4">
                <div>
                  <FormLabel className="font-normal">In-app notifications</FormLabel>
                  <FormDescription>Shown in the notification bell inside the portal.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="In-app notifications" />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notificationPushEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4">
                <div>
                  <FormLabel className="font-normal">Browser push notifications</FormLabel>
                  <FormDescription>You can grant permission for these later in Settings.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Push notifications" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="acceptedRules"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} id="accept-rules" />
              </FormControl>
              <div>
                <FormLabel htmlFor="accept-rules" className="font-normal">
                  I accept the{" "}
                  <Link href="/terms" target="_blank" className="text-primary underline">
                    portal rules
                  </Link>
                  .
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="acceptedPrivacy"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} id="accept-privacy" />
              </FormControl>
              <div>
                <FormLabel htmlFor="accept-privacy" className="font-normal">
                  I have read the{" "}
                  <Link href="/privacy" target="_blank" className="text-primary underline">
                    privacy notice
                  </Link>
                  .
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Continue to dashboard"}
        </Button>
      </form>
    </Form>
  );
}
