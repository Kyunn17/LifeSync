import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb, user, session, account, verification } from "@lifesync/db";
import { env } from "./env";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.service";

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [
    env.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const callbackParam = `callbackURL=${encodeURIComponent(
        `${env.FRONTEND_URL}/dashboard?verified=true`
      )}`;
      const fullUrl = url.includes("callbackURL=")
        ? url
        : `${url}${url.includes("?") ? "&" : "?"}${callbackParam}`;

      console.log(
        `[BetterAuth] Triggered sendVerificationEmail for ${user.email}`
      );
      console.log(`[BetterAuth] Verification link: ${fullUrl}`);

      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        url: fullUrl,
      });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
      banned: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: false,
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
    },
  },
});

