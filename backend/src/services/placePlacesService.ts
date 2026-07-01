import { getSupabase } from "../lib/supabase.js";
import { resolveCityKey } from "@wander-tale/hotel-booking-agent";

/** Slug dùng trong bảng place_places — ưu tiênextract từ key OTA (mapping cho 3 thành phố crawl). */
const KEY_TO_CITY_SLUG: Record<string, string> = {
  "ho chi minh": "ho-chi-minh",
  "sai gon": "ho-chi-minh",
  "ha noi": "ha-noi",
  "da lat": "lam-dong", // Foody lưu Đà Lạt dưới tỉnh Lâm Đồng
};

export function destinationToCitySlug(destination: string): string | null {
  if (!destination) return null;
  const key = resolveCityKey(destination);
  return KEY_TO_CITY_SLUG[key] ?? null;
}

/** Category food/drink — dùng để phân biệt khu ẩm thực vs attraction. */
const FOOD_CATEGORY_KEYWORDS = ["Nhà hàng", "Quán ăn", "Café/Dessert", "Café", "Buffet", "Tiệm bánh", "Ăn vặt"];

export type PlacePoolRow = {
  id: string;
  source: string;
  source_id: string;
  name: string;
  address: string;
  city: string;
  city_slug: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  categories: string[];
  cuisines: string[];
  image: string;
  image_urls: string[];
  rating: number | null;
  total_review: number | null;
  detail_url: string | null;
};

export type PlacePoolLite = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  categories: string[];
  cuisines: string[];
  image: string | null;
  rating: number | null;
};

export async function listPlacesByCity(
  destination: string,
  opts?: { limit?: number; categories?: string[]; randomize?: boolean; offset?: number }
): Promise<PlacePoolRow[]> {
  const slug = destinationToCitySlug(destination);
  if (!slug) return [];
  const limit = Math.min(opts?.limit ?? 20, 80);
  const sb = getSupabase();
  let q = sb.from("place_places").select("*").eq("city_slug", slug);
  if (opts?.categories && opts.categories.length > 0) {
    // PostgREST "ov" = array overlap (categories && ARRAY[...]) — chỉ cần 1 category trùng.
    const arrLiteral = `{${opts.categories.map((c) => `"${c.replace(/"/g, '\\"')}"`).join(",")}}`;
    q = q.filter("categories", "ov", arrLiteral);
  }
  if (opts?.randomize) {
    // Postgres random — phải through RPC-free raw; dùng .order("random()") không hỗ trợ → rpc sau.
    q = q.order("rating", { ascending: false, nullsFirst: false });
  } else {
    q = q.order("rating", { ascending: false, nullsFirst: false });
  }
  q = q.range(opts?.offset ?? 0, (opts?.offset ?? 0) + limit - 1);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as unknown as PlacePoolRow[];
}

export function toLite(row: PlacePoolRow): PlacePoolLite {
  return {
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    categories: row.categories ?? [],
    cuisines: row.cuisines ?? [],
    image: row.image ?? null,
    rating: row.rating ?? null,
  };
}

/** Query pool cho khu ẩm thực ( nhà hàng | quán ăn | café | buffet | tiệm bánh | ăn vặt ). */
export async function getFoodPlacesByCity(
  destination: string,
  limit = 30
): Promise<PlacePoolLite[]> {
  const rows = await listPlacesByCity(destination, { limit, categories: FOOD_CATEGORY_KEYWORDS, randomize: true });
  return rows.map(toLite);
}

/** Query pool cho loại hình cụ thể (vd chỉ cafe, hoặc chỉ nhà hàng). */
export async function getPlacesByCategory(
  destination: string,
  category: string,
  limit = 20
): Promise<PlacePoolLite[]> {
  const rows = await listPlacesByCity(destination, { limit, categories: [category], randomize: true });
  return rows.map(toLite);
}

/** Full textured pool cho LLM context — list nhỏ kèm name+address+latlng+categories+image+rating. */
export async function getPlacesContextForPrompt(
  destination: string,
  limit = 30
): Promise<PlacePoolLite[]> {
  return getFoodPlacesByCity(destination, limit);
}

/** Admin CRUD: list với pagination. */
export async function adminListPlaces(opts: {
  page?: number; pageSize?: number; city?: string; source?: string; q?: string;
}): Promise<{ rows: PlacePoolRow[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(Math.max(1, opts.pageSize ?? 25), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sb = getSupabase();
  let q = sb.from("place_places").select("*", { count: "exact" });
  if (opts.city) q = q.eq("city_slug", opts.city);
  if (opts.source) q = q.eq("source", opts.source);
  if (opts.q && opts.q.trim().length >= 2) q = q.ilike("name", `%${opts.q.trim()}%`);
  q = q.order("created_at", { ascending: false }).range(from, to);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as PlacePoolRow[], total: count ?? 0 };
}

export type PlaceUpsertInput = {
  source: string;
  source_id: string;
  name: string;
  address: string;
  city: string;
  city_slug?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  categories?: string[];
  cuisines?: string[];
  image?: string | null;
  image_urls?: string[];
  rating?: number | null;
  total_review?: number | null;
  detail_url?: string | null;
};

export async function upsertPlace(input: PlaceUpsertInput): Promise<PlacePoolRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from("place_places").upsert(
    {
      source: input.source,
      source_id: input.source_id,
      name: input.name,
      address: input.address,
      city: input.city,
      city_slug: input.city_slug ?? null,
      district: input.district ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      categories: input.categories ?? [],
      cuisines: input.cuisines ?? [],
      image: input.image ?? null,
      image_urls: input.image_urls ?? [],
      rating: input.rating ?? null,
      total_review: input.total_review ?? null,
      detail_url: input.detail_url ?? null,
    },
    { onConflict: "source,source_id" }
  ).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as PlacePoolRow | null;
}

export async function deletePlace(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("place_places").delete().eq("id", id);
  if (error) throw new Error(error.message);
}