import { z } from "zod";

const cleanString = (val?: string) =>
  (val ?? "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();

const cleanUrl = (fallback: string) => (val?: string) => {
  const cleaned = cleanString(val).replace(/\/+$/, "");
  if (!cleaned) return fallback;
  const withProto = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  try {
    new URL(withProto);
    return withProto;
  } catch {
    return fallback;
  }
};

const defaultAuthUrl = process.env.VERCEL_URL
  ? `https://${cleanString(process.env.VERCEL_URL)}`
  : "http://localhost:3001";

const envSchema = z.object({
  DATABASE_URL: z.string().optional().default("").transform(cleanString),
  DIRECT_URL: z.string().optional().default("").transform(cleanString),
  BETTER_AUTH_SECRET: z
    .string()
    .optional()
    .default("dev-secret-change-in-production-32chars")
    .transform((val) => {
      const cleaned = cleanString(val);
      return cleaned.length >= 16 ? cleaned : "dev-secret-change-in-production-32chars";
    }),
  BETTER_AUTH_URL: z
    .string()
    .optional()
    .transform(cleanUrl(defaultAuthUrl)),
  FRONTEND_URL: z
    .string()
    .optional()
    .transform(cleanUrl("http://localhost:3000")),
  PORT: z.coerce.number().catch(3001).default(3001),
  NODE_ENV: z
    .string()
    .optional()
    .default("development")
    .transform(cleanString)
    .pipe(z.enum(["development", "production", "test"]).catch("development")),

  // Brevo HTTPS Email Service (Port 443)
  BREVO_API_KEY: z.string().optional().default("").transform(cleanString),
  EMAIL_FROM: z
    .string()
    .optional()
    .default("LifeSync Wellness <arulxxds@gmail.com>")
    .transform((val) => cleanString(val) || "LifeSync Wellness <arulxxds@gmail.com>"),

  REQUIRE_EMAIL_VERIFICATION: z
    .string()
    .optional()
    .default("true")
    .transform((val) => cleanString(val).toLowerCase() !== "false"),
});

export const env = envSchema.parse(process.env);
