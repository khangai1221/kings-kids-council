"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateProfile } from "@/actions/profile";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validation/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GradeLevelRow, SchoolClassRow } from "@/types/database";

interface ProfileFormProps {
  schoolEmail: string;
  defaultDisplayName: string;
  defaultGradeLevelId: string;
  defaultSchoolClassId: string;
  defaultGraduationYear: number | null;
  gradeLevels: GradeLevelRow[];
  schoolClasses: SchoolClassRow[];
}

export function ProfileForm({
  schoolEmail,
  defaultDisplayName,
  defaultGradeLevelId,
  defaultSchoolClassId,
  defaultGraduationYear,
  gradeLevels,
  schoolClasses,
}: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      displayName: defaultDisplayName,
      gradeLevelId: defaultGradeLevelId,
      schoolClassId: defaultSchoolClassId,
      graduationYear: defaultGraduationYear ?? undefined,
    },
  });

  const selectedGrade = form.watch("gradeLevelId");
  const visibleClasses = schoolClasses.filter((c) => !c.grade_level_id || c.grade_level_id === selectedGrade);

  async function onSubmit(values: UpdateProfileInput) {
    setIsSubmitting(true);
    const result = await updateProfile(values);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Profile updated.");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <FormLabel htmlFor="profile-email">School email</FormLabel>
          <Input id="profile-email" value={schoolEmail} disabled readOnly className="mt-1.5" />
        </div>
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
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
                <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select grade" /></SelectTrigger></FormControl>
                <SelectContent>
                  {gradeLevels.map((g) => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}
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
              <FormLabel>Class / homeroom</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger></FormControl>
                <SelectContent>
                  {visibleClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
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
              <FormLabel>Graduation year</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save changes"}</Button>
      </form>
    </Form>
  );
}
