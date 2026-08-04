import "server-only";
import { nanoid } from "nanoid";
import { assertCurrentUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings/service";

export interface UploadFileParams {
  bucket: "application-files" | "suggestion-files" | "event-assets" | "council-member-images" | "public-assets";
  purpose: string;
  file: File;
  /** Folder prefix — the uploader's profile id for student-initiated uploads, or an existing entity id for admin uploads. */
  pathPrefix: string;
  allowedExtensions?: string[];
  maxSizeBytes?: number;
}

export interface UploadFileResult {
  fileRecordId: string;
  filename: string;
  storagePath: string;
}

function getExtension(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename);
  return match ? match[1].toLowerCase() : "";
}

/**
 * Validates and uploads a file, then records it in file_records. Never
 * trusts the original filename for the storage path — a random id is used
 * instead — and always re-validates type/size server-side even though the
 * client also checks (never trust client-side validation alone).
 */
export async function uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
  const user = await assertCurrentUser();
  const settings = await getSiteSettings();
  const supabase = createSupabaseServerClient();

  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_bucket_key: `file_upload:${user.profile.id}`,
    p_window_seconds: 3600,
    p_max_requests: 40,
  });
  if (allowed === false) throw new Error("Too many uploads. Please try again later.");

  const allowedExtensions = params.allowedExtensions?.length ? params.allowedExtensions : settings.allowed_file_types;
  const maxSizeBytes = params.maxSizeBytes ?? settings.file_upload_max_size_bytes;

  const extension = getExtension(params.file.name);
  if (!allowedExtensions.includes(extension)) {
    throw new Error(`File type ".${extension}" is not allowed. Allowed types: ${allowedExtensions.join(", ")}.`);
  }
  if (params.file.size > maxSizeBytes) {
    throw new Error(`File is too large. Maximum size is ${Math.round(maxSizeBytes / 1024 / 1024)}MB.`);
  }

  const safeFilename = `${nanoid(16)}.${extension}`;
  const storagePath = `${params.pathPrefix}/${safeFilename}`;

  const { error: uploadError } = await supabase.storage.from(params.bucket).upload(storagePath, params.file, {
    contentType: params.file.type || undefined,
    upsert: false,
  });
  if (uploadError) throw new Error("Upload failed. Please try again.");

  const { data: record, error: recordError } = await supabase
    .from("file_records")
    .insert({
      bucket: params.bucket,
      storage_path: storagePath,
      original_filename: params.file.name,
      mime_type: params.file.type || null,
      size_bytes: params.file.size,
      uploaded_by: user.profile.id,
      purpose: params.purpose,
    })
    .select("id")
    .single();

  if (recordError) {
    await supabase.storage.from(params.bucket).remove([storagePath]);
    throw new Error("Could not save file metadata. Please try again.");
  }

  return { fileRecordId: record.id, filename: params.file.name, storagePath };
}

/** Short-lived signed URL for a private file, after checking the caller may read the underlying file_records row (RLS-enforced). */
export async function getSignedFileUrl(fileRecordId: string, expiresInSeconds = 300): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { data: record } = await supabase.from("file_records").select("bucket, storage_path").eq("id", fileRecordId).maybeSingle();
  if (!record) return null;

  const { data, error } = await supabase.storage.from(record.bucket).createSignedUrl(record.storage_path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
