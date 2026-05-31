import { z } from "zod";

export const travelPaceSchema = z.enum(["relaxed", "balanced", "packed"]);
export const accommodationStyleSchema = z.enum(["budget", "standard", "premium"]);
export const travelPreferenceSchema = z.enum([
  "nature",
  "food",
  "culture",
  "shopping",
  "adventure",
  "relaxation",
]);

export const tripPreferencesSchema = z.object({
  tags: z.array(travelPreferenceSchema).default([]),
});

export const tripGenerateSchema = z.object({
  destination: z.string().min(2).max(200),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  budget: z.number().positive(),
  preferences: tripPreferencesSchema,
  travelers: z.number().int().min(1).max(20),
  pace: travelPaceSchema,
  /** Phong cách lưu trú — AI chọn khách sạn phù hợp ngân sách. */
  accommodation_style: accommodationStyleSchema.optional().default("standard"),
  /** Gợi ý địa điểm + quét OTA + lịch có giá (mặc định bật). */
  enrich_pricing: z.boolean().optional().default(true),
  children: z.number().int().min(0).max(10).optional(),
  rooms: z.number().int().min(1).max(10).optional(),
});

export const tripUpdateSchema = z
  .object({
    destination: z.string().min(2).max(200).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    budget: z.number().positive().optional(),
    preferences: tripPreferencesSchema.optional(),
    travelers: z.number().int().min(1).max(20).optional(),
    pace: travelPaceSchema.optional(),
    summary: z.string().nullable().optional(),
    total_estimated_cost: z.number().nullable().optional(),
    risk_warnings: z.array(z.string()).nullable().optional(),
    itinerary_json: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

export type TripGenerateInput = z.infer<typeof tripGenerateSchema>;
export type TripUpdateInput = z.infer<typeof tripUpdateSchema>;
