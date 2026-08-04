import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { FaqList } from "@/app/(portal)/faq/faq-list";

export const metadata = { title: "FAQ" };

export default async function FaqPage() {
  await requireOnboardedUser();
  const supabase = createSupabaseServerClient();
  const [{ data: faqs }, { data: categories }] = await Promise.all([
    supabase.from("faqs").select("*").eq("status", "published").order("sort_order"),
    supabase.from("faq_categories").select("*"),
  ]);

  const categoryLabelById = Object.fromEntries((categories ?? []).map((c) => [c.id, c.label]));

  return (
    <div className="max-w-2xl">
      <PageHeader title="Frequently Asked Questions" />
      <FaqList faqs={faqs ?? []} categoryLabelById={categoryLabelById} />
    </div>
  );
}
