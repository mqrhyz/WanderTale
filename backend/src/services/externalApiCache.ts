import { getSupabase } from "../lib/supabase.js";

type MemoryEntry = {
  source: string;
  payload: unknown;
  expiresAt: number;
};

const memory = new Map<string, MemoryEntry>();

export async function getCachedValue<T>(key: string): Promise<T | null> {
  const mem = memory.get(key);
  if (mem && mem.expiresAt > Date.now()) return mem.payload as T;
  if (mem) memory.delete(key);

  try {
    const { data, error } = await getSupabase()
      .from("external_api_cache")
      .select("source,payload,expires_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (error || !data) return null;
    const expiresAt = new Date(data.expires_at as string).getTime();
    if (expiresAt <= Date.now()) return null;
    memory.set(key, { source: String(data.source), payload: data.payload, expiresAt });
    return data.payload as T;
  } catch {
    return null;
  }
}

export async function setCachedValue(
  key: string,
  payload: unknown,
  ttlSeconds: number,
  source = "external"
): Promise<void> {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  memory.set(key, { source, payload, expiresAt });

  try {
    await getSupabase().from("external_api_cache").upsert({
      cache_key: key,
      source,
      payload,
      expires_at: new Date(expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch {
    /* DB cache is optional; memory fallback keeps requests functional. */
  }
}
