"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      });

      if (result.error) {
        setServerError(
          result.error.message || "Invalid email or password. Please try again."
        );
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Unable to connect to authentication service"
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col justify-between selection:bg-secondary-container selection:text-on-secondary-container">
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-gutter-mobile lg:px-margin flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-space-sm group transition-transform active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-xl bg-secondary-container flex items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
              <span className="material-symbols-outlined text-[22px]">spa</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface leading-none">
                LifeSync
              </span>
              <span className="font-label-sm text-label-sm text-secondary tracking-widest uppercase mt-0.5">
                Digital Vitality
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-space-md">
            <div className="hidden sm:flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container-low text-secondary">
              <span className="material-symbols-outlined text-[16px] text-primary">
                verified_user
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                HIPAA & ISO 27001 Verified
              </span>
            </div>
            <Link
              href="/"
              className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full pt-16 flex-1 flex flex-col justify-center">
        <div className="relative w-full overflow-hidden py-space-xl px-gutter-mobile lg:px-margin flex items-center justify-center">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-secondary-container/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-20 w-[450px] h-[450px] rounded-full bg-surface-container-high/40 blur-3xl pointer-events-none" />

          <div className="relative w-full max-w-xl flex flex-col items-center">
            <div className="inline-flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-secondary-container/60 text-secondary mb-space-md shadow-sm">
              <span
                className="material-symbols-outlined text-[16px] text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                eco
              </span>
              <span className="font-label-md text-label-md text-on-secondary-fixed-variant">
                Welcome back to balance
              </span>
            </div>

            <div className="w-full bg-surface-container-lowest rounded-xl shadow-xl p-space-lg sm:p-space-xl flex flex-col">
              <div className="flex flex-col text-center items-center mb-space-lg">
                <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary mb-space-sm shadow-sm">
                  <span
                    className="material-symbols-outlined text-[28px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    spa
                  </span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface">
                  Sign in to LifeSync
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-sm">
                  Resume your 24-hour circadian and lifestyle rhythm.
                </p>
              </div>

              {serverError && (
                <div className="mb-space-md p-3.5 rounded-xl bg-error-container text-on-error-container font-label-md text-label-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    error
                  </span>
                  <span>{serverError}</span>
                </div>
              )}

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-space-md"
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email-input"
                    className="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between"
                  >
                    <span>Work or Personal Email</span>
                    <span className="font-label-sm text-label-sm text-secondary font-normal">
                      Encrypted
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-outline pointer-events-none">
                      mail
                    </span>
                    <input
                      id="email-input"
                      type="email"
                      placeholder="elena@circadianlife.io"
                      {...register("email")}
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline-variant font-body-md text-body-md transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:shadow-sm"
                    />
                  </div>
                  {errors.email && (
                    <span className="font-body-sm text-body-sm text-error">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password-input"
                      className="font-label-md text-label-md text-on-surface font-medium"
                    >
                      Password
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-outline pointer-events-none">
                      lock
                    </span>
                    <input
                      id="password-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      {...register("password")}
                      className="w-full pl-11 pr-12 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline-variant font-body-md text-body-md transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 text-outline hover:text-on-surface p-1 rounded-lg transition-colors"
                      title="Toggle password visibility"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  {errors.password && (
                    <span className="font-body-sm text-body-sm text-error">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      {...register("rememberMe")}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded-lg bg-surface-container-low peer-checked:bg-primary flex items-center justify-center text-on-primary transition-all shadow-sm">
                      <span className="material-symbols-outlined text-[15px] opacity-0 peer-checked:opacity-100 transition-opacity">
                        check
                      </span>
                    </div>
                    <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                      Remember device (7 days)
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-space-lg rounded-xl bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-space-xs shadow-md hover:bg-primary-container active:scale-[0.99] transition-all duration-150 disabled:opacity-60"
                >
                  <span>
                    {isSubmitting ? "Signing in..." : "Sign In to LifeSync"}
                  </span>
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </button>
              </form>

              <div className="mt-space-lg pt-space-md flex flex-col items-center gap-space-sm text-center">
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  Don&apos;t have a LifeSync account yet?{" "}
                  <Link
                    href="/register"
                    className="text-primary font-semibold hover:underline ml-1"
                  >
                    Create your account
                  </Link>
                </div>
                <div className="flex items-center justify-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-low text-outline text-[12px]">
                  <span className="material-symbols-outlined text-[14px] text-primary">
                    shield
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    256-bit encrypted • Sovereign Health Telemetry
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-space-lg max-w-md text-center flex flex-col items-center gap-space-xs">
              <div className="flex items-center gap-1.5 text-secondary">
                <span className="material-symbols-outlined text-[16px]">
                  self_improvement
                </span>
                <span className="font-label-sm text-label-sm tracking-wide uppercase font-semibold">
                  Circadian Principle
                </span>
              </div>
              <blockquote className="font-body-md text-body-md italic text-on-surface-variant">
                &ldquo;A harmonized day begins with mindful awareness.&rdquo;
              </blockquote>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full bg-surface-container-low/60 py-space-md">
        <div className="max-w-7xl mx-auto px-gutter-mobile lg:px-margin flex flex-col sm:flex-row items-center justify-between gap-space-sm font-label-sm text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[14px] text-primary">
              lock
            </span>
            <span>End-to-End Encrypted Health Profile</span>
          </div>
          <div className="flex items-center gap-space-md">
            <span>Privacy Notice</span>
            <span className="text-outline-variant">•</span>
            <span>Clinical Standards</span>
            <span className="text-outline-variant">•</span>
            <span>© 2026 LifeSync Health</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

