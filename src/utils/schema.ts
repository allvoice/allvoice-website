import { z } from "zod";

export const voiceEditFormSchema = z.object({
  similarity: z.number().min(0).max(1),
  stability: z.number().min(0).max(1),
  style: z.number().min(0).max(1),
  speakerBoost: z.boolean(),
  modelName: z.string(),
});
