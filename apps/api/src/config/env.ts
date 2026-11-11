import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional().default(""),
  DIRECT_URL: z.string().optional().default(""),
  BETTER_AUTH_SECRET: z.string().optional().default("dev-secret-change-in-production-32chars"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("LifeSync Wellness <onboarding@resend.dev>"),
  REQUIRE_EMAIL_VERIFICATION: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),
});

export const env = envSchema.parse(process.env);

