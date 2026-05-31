import { z } from "zod";
import { llmGenerateJsonFast, parseModelJsonText, llmContextCharLimit } from "../lib/llm.js";
import type { TripGenerateInput } from "../schemas/trip.js";
import type { TripGenerationContext } from "./tripGenerationContext.js";

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

export async function suggestPlacesForTrip(
  body: TripGenerateInput,
  context: TripGenerationContext
): Promise<SuggestedPlacesPlan> {
  const numDays = context.dates.length;
  const ctx = llmContextCharLimit();
  const prompt = [
    `Bạn là chuyên gia du lịch Việt Nam. Gợi ý danh sách địa điểm CỤ THỂ (tên thật) cho chuyến đi.`,
    `Trả về JSON: { "places": [ { "name", "type": "attraction"|"restaurant"|"activity", "day"?: 1..${numDays}, "estimated_cost_vnd"?: number, "duration_minutes"?: number, "note"?: string } ] }`,
    `Destination: ${body.destination}`,
    `Dates: ${body.start_date} → ${body.end_date} (${numDays} ngày)`,
    `Budget tổng (ước tính VND hoặc đơn vị user nhập): ${body.budget}`,
    `Travelers: ${body.travelers}, pace: ${body.pace}, accommodation: ${body.accommodation_style ?? "standard"}`,
    `Preferences: ${body.preferences.tags.join(", ") || "general"}`,
    `Gợi ý đúng ${numDays * 3} địa điểm — ${numDays} ngày × 3 buổi (sáng/chiều/tối), mỗi buổi 1 địa điểm riêng.`,
    `Mỗi place BẮT BUỘC có "day" (1..${numDays}) và "name" là tên riêng cụ thể (không chung chung).`,
    `Không trùng tên địa điểm trong cùng chuyến đi.`,
    `estimated_cost_vnd: vé/ăn uống ước tính mỗi người hoặc mỗi lượt (VND).`,
    `WEATHER_JSON:\n${JSON.stringify(context.weather).slice(0, ctx)}`,
    `PLACES_JSON:\n${JSON.stringify(context.places).slice(0, ctx)}`,
  ].join("\n");

  const text = await llmGenerateJsonFast(prompt);
  let parsed: unknown;
  try {
    parsed = parseModelJsonText(text);
  } catch {
    return { places: [] };
  }
  const check = suggestedPlacesSchema.safeParse(parsed);
  return check.success ? check.data : { places: [] };
}
