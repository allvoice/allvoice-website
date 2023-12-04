import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(2, { message: "Username must be at least 2 characters long" })
  .max(20, { message: "Username must be no longer than 20 characters" })
  .regex(/^[a-zA-Z0-9-]+$/, {
    message: "Username can only contain alphanumeric characters and hyphens",
  });

export const voiceEditFormSchema = z.object({
  similarity: z.number().min(0).max(1),
  stability: z.number().min(0).max(1),
  style: z.number().min(0).max(1),
  speakerBoost: z.boolean(),
  modelName: z.string(),
});
