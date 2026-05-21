import { z } from "zod";
import { PACE_OPTIONS, PREFERENCE_OPTIONS } from "@wander-tale/shared/constants";

export const wizardSchema = z
  .object({
    destination: z.string().min(2).max(200),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    budget: z.coerce.number().positive(),
    travelers: z.coerce.number().int().min(1).max(20),
    pace: z.enum(PACE_OPTIONS),
    preferences: z.array(z.enum(PREFERENCE_OPTIONS)).optional().default([]),
  })
  .refine((d) => d.end_date >= d.start_date, { message: "end_date phải sau start_date", path: ["end_date"] });

export type WizardValues = z.infer<typeof wizardSchema>;
