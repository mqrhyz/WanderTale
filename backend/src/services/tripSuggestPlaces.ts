import { z } from "zod";
import { llmGenerateJsonFast, parseModelJsonText, llmContextCharLimit } from "../lib/llm.js";
import { searchPlacesOptional } from "../lib/placesProvider.js";
import { getFoodPlacesByCity } from "./placePlacesService.js";
import type { TripGenerateInput } from "../schemas/trip.js";
import type { TripGenerationContext } from "./tripGenerationContext.js";

/** Từ khóa đánh dấu địa điểm KHÔNG phải du lịch — lọc kết quả VietMap/Google Places + cả gợi ý LLM. */
const NON_TOURIST_KEYWORDS = [
  // Cơ quan nhà nước / chính trị
  "công an", "ubnd", "ủy ban", "uỷ ban", "hội đồng nhân dân", "hđnd",
  "thành ủy", "thành uỷ", "tỉnh ủy", "tỉnh uỷ", "huyện ủy", "huyện uỷ",
  "quận ủy", "quận uỷ", "đảng ủy", "đảng uỷ", "chi cục", "cục thuế",
  "sở ", "phòng ", "ban quản lý", "ban chỉ huy", "tòa án", "toà án",
  "viện kiểm sát", "kho bạc", "hải quan", "bộ chỉ huy", "đồn biên phòng",
  "hội trường", "bưu điện", "trung tâm hành chính", "trụ sở",
  // Giáo dục / y tế
  "trường", "đại học", "cao đẳng", "trung học", "tiểu học", "mầm non",
  "bệnh viện", "phòng khám", "trạm y tế", "nhà thuốc", "trung tâm y tế",
  // Công nghiệp / dịch vụ không du lịch
  "nhà máy", "khu công nghiệp", "cụm công nghiệp", "xí nghiệp",
  "nghĩa trang", "nghĩa địa", "sửa chữa", "xe máy", "ô tô", "gara", "garage",
  "công ty", "chi nhánh", "đại lý", "cửa hàng gia dụng", "siêu thị mini",
  "trang điểm", "dự tiệc", "mua bán nhà đất", "bất động sản", "địa điểm giao dịch",
  "kính", "glass", "nội thất", "vật liệu xây dựng", "phân bón", "thuốc trừ sâu",
  "xăng dầu", "cây xăng", "trạm xăng", "ngân hàng", "atm", "kho ", "bãi xe",
  "văn phòng", "tổng đài", "viễn thông", "điện lực", "cấp nước", "bảo hiểm",
];

function isNonTouristPlace(name: string): boolean {
  const lower = name.toLowerCase();
  return NON_TOURIST_KEYWORDS.some((kw) => lower.includes(kw));
}

const suggestedPlaceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["attraction", "restaurant", "activity"]),
  day: z.number().int().positive().optional(),
  estimated_cost_vnd: z.number().nonnegative().optional(),
  duration_minutes: z.number().int().positive().optional(),
  note: z.string().optional(),
});

export const suggestedPlacesSchema = z.object({
  places: z.array(suggestedPlaceSchema),
});

export type SuggestedPlace = z.infer<typeof suggestedPlaceSchema>;
export type SuggestedPlacesPlan = z.infer<typeof suggestedPlacesSchema>;

/** Lọc bỏ địa điểm phi du lịch khỏi danh sách gợi ý (dù từ LLM hay VietMap). */
export function filterTouristPlaces(places: SuggestedPlace[]): SuggestedPlace[] {
  return places.filter((p) => p.name.trim() && !isNonTouristPlace(p.name));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);
}

async function suggestPlacesFromVietMap(
  body: TripGenerateInput,
  context: TripGenerationContext
): Promise<SuggestedPlacesPlan> {
  try {
    // Attraction vẫn dùng VietMap/Google Places; food/cafe dùng pool crawl từ DB.
    const attractionSearches: Array<{ query: string; type: SuggestedPlace["type"] }> = [
      { query: `${body.destination} địa điểm du lịch`, type: "attraction" },
      { query: `${body.destination} thắng cảnh`, type: "attraction" },
    ];
    const [attractionResults, foodPool] = await Promise.all([
      Promise.all(
        attractionSearches.map(async (search) => ({
          type: search.type,
          result: await searchPlacesOptional(search.query, context.lat, context.lng),
        }))
      ),
      getFoodPlacesByCity(body.destination, 20).catch(() => []),
    ]);

    const places: SuggestedPlace[] = [];
    const seen = new Set<string>();
    const pushRows = (rows: unknown[], type: SuggestedPlace["type"]) => {
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const rec = row as Record<string, unknown>;
        const name =
          typeof rec.name === "string"
            ? rec.name.trim()
            : typeof rec.formattedAddress === "string"
              ? rec.formattedAddress.trim()
              : "";
        const key = name.toLocaleLowerCase("vi-VN");
        if (!name || seen.has(key)) continue;
        if (isNonTouristPlace(name)) continue;
        seen.add(key);
        places.push({
          name,
          type,
          day: (places.length % Math.max(context.dates.length, 1)) + 1,
        });
      }
    };
    for (const { result, type } of attractionResults) {
      const rows =
        result && typeof result === "object" && Array.isArray((result as { places?: unknown }).places)
          ? ((result as { places: unknown[] }).places)
          : [];
      pushRows(rows, type);
    }
    // Food pool — xen kẽ restaurant/cafe theo pool thật.
    for (const p of foodPool) {
      const name = p.name?.trim();
      const key = (name ?? "").toLocaleLowerCase("vi-VN");
      if (!name || seen.has(key)) continue;
      if (isNonTouristPlace(name)) continue;
      seen.add(key);
      const type: SuggestedPlace["type"] = p.categories?.some((c) => c.includes("Café") || c.includes("Dessert"))
        ? "activity"
        : "restaurant";
      places.push({
        name,
        type,
        day: (places.length % Math.max(context.dates.length, 1)) + 1,
      });
    }
    return { places };
  } catch (error) {
    console.warn("[trip-gen] VietMap suggested places fallback failed:", error);
    return { places: [] };
  }
}

export async function suggestPlacesForTrip(
  body: TripGenerateInput,
  context: TripGenerationContext
): Promise<SuggestedPlacesPlan> {
  const numDays = context.dates.length;
  const ctx = llmContextCharLimit();
  const now = new Date();
  const monthYear = `tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
  const prompt = [
    `Bạn là chuyên gia du lịch Việt Nam. Gợi ý danh sách địa điểm CỤ THỂ (tên thật) cho chuyến đi.`,
    `Trả về JSON: { "places": [ { "name", "type": "attraction"|"restaurant"|"activity", "day"?: 1..${numDays}, "estimated_cost_vnd"?: number, "duration_minutes"?: number, "note"?: string } ] }`,
    `Destination: ${body.destination}`,
    `Dates: ${body.start_date} → ${body.end_date} (${numDays} ngày)`,
    `Budget tổng (ước tính VND hoặc đơn vị user nhập): ${body.budget}`,
    `Travelers: ${body.travelers}`,
    `Pace: ${body.pace}. Nếu relaxed thì ít điểm, gần nhau, nhẹ nhàng; nếu packed thì nhiều điểm, tối ưu thời gian; nếu balanced thì xen kẽ tham quan và nghỉ ngơi.`,
    `Accommodation style: ${body.accommodation_style ?? "standard"}. Điều này ảnh hưởng khoảng cách lưu trú đến trung tâm: budget ưu tiên khu vực giá rẻ, standard/premium ưu tiên thuận tiện/trung tâm hoặc view đẹp.`,
    `Preferences: ${body.preferences.tags.join(", ") || "general"}. ĐÂY LÀ ƯU TIÊN HÀNG ĐẦU: mỗi ngày nên có ít nhất 2–3 địa điểm khớp trực tiếp với các tag này. Nếu chọn giữa hai điểm tương đương, chọn điểm khớp tag sở thích.`,
    `Thời điểm hiện tại: ${monthYear}. Sau khi đã ưu tiên sở thích, mới cân nhắc HOT/hợp mùa; tránh nơi đã lỗi thời hoặc vắng khách.`,
    `CHỈ gợi ý ĐỊA ĐIỂM DU LỊCH THỰC SỰ: danh thắng, bãi biển, hồ, núi, thác, chùa/nhà thờ/di tích, bảo tàng, công viên, khu vui chơi, chợ đêm/phố đi bộ, quán ăn ngon, quán cafe đẹp, spa.`,
    `TUYỆT ĐỐI KHÔNG gợi ý: cơ quan nhà nước (thành ủy, tỉnh ủy, UBND, công an, sở/phòng/ban, tòa án, kho bạc, bưu điện, trung tâm hành chính, trụ sở), trường học/đại học, bệnh viện/phòng khám, nhà máy/khu công nghiệp, ngân hàng/ATM, văn phòng công ty, cây xăng, nghĩa trang, gara/sửa xe. Những nơi này KHÔNG phải điểm du lịch.`,
    `TUYỆT ĐỐI KHÔNG gợi ý địa điểm đã ĐÓNG CỬA VĨNH VIỄN, ngừng hoạt động, hoặc đang đóng cửa dài hạn.`,
    `Gợi ý đúng ${numDays * 3} địa điểm — ${numDays} ngày × 3 buổi (sáng/chiều/tối), mỗi buổi 1 địa điểm riêng.`,
    `Mỗi place BẮT BUỘC có "day" (1..${numDays}) và "name" là tên riêng cụ thể (không chung chung).`,
    `"note" (tuỳ chọn) NÊN là 1 câu mô tả ngắn HẤP DẪN riêng cho địa điểm đó (điểm nổi bật, trải nghiệm, món signature, view...) — KHÔNG viết chung chung kiểu "khám phá X".`,
    `Không trùng tên địa điểm trong cùng chuyến đi.`,
    `estimated_cost_vnd: vé/ăn uống ước tính mỗi người hoặc mỗi lượt (VND).`,
    `WEATHER_JSON:\n${JSON.stringify(context.weather).slice(0, ctx)}`,
    `PLACES_JSON:\n${JSON.stringify(context.places).slice(0, ctx)}`,
  ].join("\n");

  try {
    const text = await withTimeout(llmGenerateJsonFast(prompt), 12_000, "suggestPlaces");
    const parsed = parseModelJsonText(text);
    const check = suggestedPlacesSchema.safeParse(parsed);
    if (check.success && check.data.places.length > 0) {
      const filtered = filterTouristPlaces(check.data.places);
      if (filtered.length > 0) return { places: filtered };
    }
  } catch (error) {
    console.warn("[trip-gen] Gemini suggested places failed, fallback VietMap:", error);
  }
  return suggestPlacesFromVietMap(body, context);
}
