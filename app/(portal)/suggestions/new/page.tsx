import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { SuggestionForm } from "@/app/(portal)/suggestions/new/suggestion-form";

export const metadata = { title: "New Suggestion" };

export default async function NewSuggestionPage() {
  await requireOnboardedUser();
  const supabase = createSupabaseServerClient();
  const { data: categories } = await supabase.from("suggestion_categories").select("*").eq("is_active", true).order("sort_order");

  return (
    <div className="max-w-xl">
      <PageHeader title="Submit a suggestion" />
      <SuggestionForm categories={categories ?? []} />
    </div>
  );
}
