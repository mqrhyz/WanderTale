import { randomUUID } from "node:crypto";
import { env } from "../lib/env.js";
import { getSupabase } from "../lib/supabase.js";

const BUCKET = "media";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export async function uploadUserImage(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  folder = "uploads",
): Promise<{ url: string; path: string }> {
  const mime = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error("unsupported_image_type");
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error("file_too_large");
  }

  const ext = extForMime(mime);
  const path = `${folder}/${userId}/${randomUUID()}.${ext}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const base = env.SUPABASE_URL.replace(/\/$/, "");
  const url = data.publicUrl.startsWith("http")
    ? data.publicUrl
    : `${base}/storage/v1/object/public/${BUCKET}/${path}`;
  return { url, path };
}
