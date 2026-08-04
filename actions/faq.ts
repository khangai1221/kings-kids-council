"use server";

import { revalidatePath } from "next/cache";
import { assertCurrentUser, assertCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function submitFaqFeedback(faqId: string, isHelpful: boolean): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();
    await supabase.from("faq_feedback").upsert(
      { faq_id: faqId, student_id: user.profile.id, is_helpful: isHelpful },
      { onConflict: "faq_id,student_id" },
    );
    return undefined;
  });
}

export async function createFaq(input: { categoryId?: string; question: string; answer: string; status: "draft" | "published" }): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("faq.manage");
    const supabase = createSupabaseServerClient();
    const { count } = await supabase.from("faqs").select("id", { count: "exact", head: true });
    const { error } = await supabase.from("faqs").insert({
      category_id: input.categoryId || null,
      question: input.question,
      answer: input.answer,
      status: input.status,
      sort_order: count ?? 0,
    });
    if (error) throw error;
    revalidatePath("/admin/faq");
    return undefined;
  });
}

export async function updateFaqStatus(faqId: string, status: "draft" | "published" | "archived"): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("faq.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("faqs").update({ status }).eq("id", faqId);
    if (error) throw error;
    revalidatePath("/admin/faq");
    return undefined;
  });
}
