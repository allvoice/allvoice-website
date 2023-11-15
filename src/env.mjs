import { z } from "zod";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]),
    CLERK_SECRET_KEY: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    BUCKET_NAME: z.string(),
    BUCKET_HOST: z.string(),
    BUCKET_NOTIFICATION_SECRET: z.string(),
    ELEVENLABS_API_KEY: z.string(),
    ELEVENLABS_MAX_VOICES: z.number({ coerce: true }).min(1),
    ELEVENLABS_MAX_CONCURRENCY: z.number({ coerce: true }).min(1),
    DATABASE_LOG_LEVEL: z.enum(["INFO", "WARN", "ERROR"]),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    NEXT_PUBLIC_ELEVENLABS_MAX_ACTIVE_SAMPLES: z
      .number({ coerce: true })
      .min(1),
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_ELEVENLABS_MAX_ACTIVE_SAMPLES:
      process.env.NEXT_PUBLIC_ELEVENLABS_MAX_ACTIVE_SAMPLES,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
