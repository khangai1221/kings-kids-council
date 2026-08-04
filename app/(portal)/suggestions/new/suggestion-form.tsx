"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { submitSuggestion } from "@/actions/suggestions";
import { submitSuggestionSchema, type SubmitSuggestionInput } from "@/lib/validation/suggestion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SuggestionCategoryRow } from "@/types/database";

export function SuggestionForm({ categories }: { categories: SuggestionCategoryRow[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<SubmitSuggestionInput>({
    resolver: zodResolver(submitSuggestionSchema),
    defaultValues: { categoryId: "", subject: "", message: "", proposedSolution: "", identityMode: "identified" },
  });

  async function onSubmit(values: SubmitSuggestionInput) {
    setIsSubmitting(true);
    let formData: FormData | undefined;
    if (file) {
      formData = new FormData();
      formData.append("file", file);
    }
    const result = await submitSuggestion(values, formData);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Suggestion submitted. Thank you!");
    router.push(`/suggestions/${result.data.suggestionId}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="subject" render={({ field }) => (
          <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="message" render={({ field }) => (
          <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea rows={5} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="proposedSolution" render={({ field }) => (
          <FormItem><FormLabel>Proposed solution (optional)</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="space-y-1.5">
          <Label htmlFor="suggestion-file">Attachment (optional)</Label>
          <Input id="suggestion-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>

        <FormField
          control={form.control}
          name="identityMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Identity</FormLabel>
              <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="identified" id="identity-identified" />
                  <Label htmlFor="identity-identified" className="font-normal">Identified — the council can see it&apos;s from me</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="anonymous_to_council" id="identity-anonymous" />
                  <Label htmlFor="identity-anonymous" className="font-normal">Anonymous to council</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Anonymous submissions hide your identity from ordinary council members. This is a
                privacy-preserving convention, not a technically untraceable submission — see our{" "}
                <a href="/privacy" target="_blank" className="underline">privacy notice</a>.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting…" : "Submit suggestion"}</Button>
      </form>
    </Form>
  );
}
