import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormKind } from "@/lib/constants";

export interface PublishedFormVersionOption {
  formVersionId: string;
  label: string;
}

/** Published (or closed) form versions for a given kind, labeled "Form title (v2)" for pickers. */
export async function listPublishedFormVersions(kind: FormKind): Promise<PublishedFormVersionOption[]> {
  const supabase = createSupabaseServerClient();
  const { data: forms } = await supabase.from("forms").select("id, title").eq("kind", kind).in("status", ["published", "closed"]);
  if (!forms || forms.length === 0) return [];

  const { data: versions } = await supabase
    .from("form_versions")
    .select("id, form_id, version_number")
    .in("form_id", forms.map((f) => f.id))
    .in("status", ["published", "closed"])
    .order("version_number", { ascending: false });

  const titleByFormId = new Map(forms.map((f) => [f.id, f.title]));
  return (versions ?? []).map((version) => ({
    formVersionId: version.id,
    label: `${titleByFormId.get(version.form_id) ?? "Form"} (v${version.version_number})`,
  }));
}
