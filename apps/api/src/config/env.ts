import { z } from "zod";

const cleanString = (val?: string) =>
  (val ?? "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();

const cleanUrl = (val: string) => cleanString(val).replace(/\/+$/, "");

const envSchema = z.object({
  DATABASE_URL: z.string().optional().default("").transform(cleanString),
  DIRECT_URL: z.string().optional().default("").transform(cleanString),
  BETTER_AUTH_SECRET: z
    .string()
    .optional()
    .default("dev-secret-change-in-production-32chars")
    .transform(cleanString),
  BETTER_AUTH_URL: z
    .string()
    .default("http://localhost:3001")
    .transform(cleanUrl)
    .pipe(z.string().url()),
  FRONTEND_URL: z
    .string()
    .default("http://localhost:3000")
    .transform(cleanUrl)
    .pipe(z.string().url()),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .string()
    .default("development")
    .transform(cleanString)
    .pipe(z.enum(["development", "production", "test"]).catch("development")),

  // Brevo HTTPS Email Service (Port 443)
  BREVO_API_KEY: z.string().optional().default("").transform(cleanString),
  EMAIL_FROM: z
    .string()
    .default("LifeSync Wellness <arulxxds@gmail.com>")
    .transform(cleanString),

  REQUIRE_EMAIL_VERIFICATION: z
    .string()
    .optional()
    .default("true")
    .transform((val) => cleanString(val).toLowerCase() !== "false"),
});

export const env = envSchema.parse(process.env);
