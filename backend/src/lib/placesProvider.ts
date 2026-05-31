import { isVietmapConfigured, placesSearchOptional as vietmapPlacesSearch } from "./vietmap.js";
import { placesTextSearch, placesTextSearchOptional as googlePlacesSearch } from "../services/googleMaps.js";

/** Ưu tiên VietMap (VN) → Google Places. Không throw. */
export async function searchPlacesOptional(
  query: string,
  lat: number | null,
  lng: number | null
): Promise<unknown> {
  if (isVietmapConfigured()) {
    const v = await vietmapPlacesSearch(query, lat, lng);
    if (v && typeof v === "object" && "status" in v && (v as { status: string }).status === "ok") {
      return v;
    }
  }
  return googlePlacesSearch(query, lat, lng);
}

/** Ưu tiên VietMap → Google. Throw nếu cả hai không khả dụng / lỗi. */
export async function searchPlaces(
  query: string,
  lat: number | null,
  lng: number | null
): Promise<unknown> {
  if (isVietmapConfigured()) {
    const v = await vietmapPlacesSearch(query, lat, lng);
    if (v && typeof v === "object" && "status" in v && (v as { status: string }).status === "ok") {
      return v;
    }
  }
  return placesTextSearch(query, lat, lng);
}
