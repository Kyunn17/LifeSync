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
  
  // Gmail SMTP & Custom SMTP Configuration
  SMTP_HOST: z
    .string()
    .optional()
    .default(process.env.MAIL_HOST || "smtp.gmail.com")
    .transform(cleanString),
  SMTP_PORT: z.coerce
    .number()
    .default(Number(process.env.MAIL_PORT) || 587),
  SMTP_USER: z
    .string()
    .optional()
    .default(process.env.MAIL_USERNAME || "")
    .transform(cleanString),
  SMTP_PASS: z
    .string()
    .optional()
    .default(process.env.MAIL_PASSWORD || "")
    .transform((val) => cleanString(val).replace(/\s+/g, "")),
  SMTP_SECURE: z
    .string()
    .optional()
    .default(
      process.env.MAIL_PORT === "465" || process.env.MAIL_ENCRYPTION === "ssl"
        ? "true"
        : "false"
    )
    .transform((val) => cleanString(val).toLowerCase() === "true"),
  MAIL_FROM_ADDRESS: z
    .string()
    .optional()
    .default(process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || "")
    .transform(cleanString),
  MAIL_FROM_NAME: z
    .string()
    .optional()
    .default(
      process.env.MAIL_FROM_NAME && process.env.MAIL_FROM_NAME !== "${APP_NAME}"
        ? process.env.MAIL_FROM_NAME
        : "LifeSync Wellness"
    )
    .transform(cleanString),

  BREVO_API_KEY: z.string().optional().default("").transform(cleanString),

  REQUIRE_EMAIL_VERIFICATION: z
    .string()
    .optional()
    .default("true")
    .transform((val) => cleanString(val).toLowerCase() !== "false"),
});

export const env = envSchema.parse(process.env);
