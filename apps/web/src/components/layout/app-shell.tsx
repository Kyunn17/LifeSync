"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  Clock,
  Activity,
  Sparkles,
  SlidersHorizontal,
  HelpCircle,
  UserCog,
  Calendar,
  ChevronDown,
  Plus,
  Bell,
  ShieldCheck,
  LogOut,
  MailCheck,
  Send,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, signOut, authClient } from "@/lib/auth-client";
import { LanguageSwitcher, useLanguage } from "@/lib/i18n";

interface AppShellProps {
  children: React.ReactNode;
  userRole?: "USER" | "ADMIN";
  onQuickLogClick?: () => void;
  selectedDateLabel?: string;
  balanceScore?: number;
}

export function AppShell({
  children,
  userRole,
  onQuickLogClick,
  selectedDateLabel,
  balanceScore = 88,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const { t, locale } = useLanguage();

  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailSentNotice, setEmailSentNotice] = useState(false);
  const [verifiedDismissed, setVerifiedDismissed] = useState(false);

  const isVerifiedParam = searchParams.get("verified") === "true";
  const isEmailVerified = Boolean(
    (session?.user as { emailVerified?: boolean } | undefined)?.emailVerified
  );

  const handleResendVerification = async () => {
    if (!session?.user?.email || resendingEmail) return;
    setResendingEmail(true);
    try {
      await authClient.sendVerificationEmail({
        email: session.user.email,
        callbackURL: `${window.location.origin}/dashboard?verified=true`,
      });
      setEmailSentNotice(true);
      setTimeout(() => setEmailSentNotice(false), 8000);
    } catch (e) {
      console.error("[AppShell] Failed to resend verification email:", e);
    } finally {
      setResendingEmail(false);
    }
  };

  const navItems = [
    {
      label: t("Dashboard", "Dasbor"),
      href: "/dashboard",
      icon: LayoutGrid,
    },
    {
      label: t("Daily Schedule", "Jadwal Harian"),
      href: "/schedule",
      icon: Clock,
    },
    {
      label: t("Wellness Tracking", "Pelacakan Kesehatan"),
      href: "/wellness",
      icon: Activity,
    },
    {
      label: t("Insights & Patterns", "Wawasan & Pola"),
      href: "/insights",
      icon: Sparkles,
    },
    {
      label: t("Settings", "Pengaturan"),
      href: "/settings",
      icon: SlidersHorizontal,
    },
  ];

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  const effectiveRole =
    userRole ||
    ((session?.user as { role?: "USER" | "ADMIN" } | undefined)?.role ?? "USER");

  const todayFormatted =
    selectedDateLabel ||
    `${t("Today", "Hari Ini")}, ${new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(new Date())}`;

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-secondary-container flex items-center justify-center text-primary animate-pulse">
            <span className="material-symbols-outlined text-[24px]">spa</span>
          </div>
          <span className="font-label-md text-label-md text-secondary">
            {t(
              "Loading your daily dashboard...",
              "Memuat dasbor harian Anda..."
            )}
          </span>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const initials = (session.user.name || session.user.email || "LS")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
      {/* Left Fixed Sidebar matching Stitch design */}
      <aside className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col justify-between bg-surface-container-lowest py-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col">
          <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary-container text-primary">
              <span className="material-symbols-outlined text-[22px]">spa</span>
            </div>
            <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-primary">
              LifeSync
            </span>
          </Link>

          <div className="mb-3 px-4">
            <span className="px-3 font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
              {t("Overview", "Ringkasan")}
            </span>
          </div>

          <nav className="flex flex-col gap-1 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                    isActive
                      ? "bg-primary-container font-bold text-on-primary shadow-[0_4px_12px_rgba(13,122,83,0.18)]"
                      : "font-label-lg text-label-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {effectiveRole === "ADMIN" && (
              <Link
                href="/admin"
                className={cn(
                  "mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                  pathname.startsWith("/admin")
                    ? "bg-primary-container font-bold text-on-primary shadow-[0_4px_12px_rgba(13,122,83,0.18)]"
                    : "font-label-lg text-label-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                )}
              >
                <ShieldCheck className="h-5 w-5" />
                <span>{t("Admin Console", "Konsol Admin")}</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-1 px-4">
          <div className="mb-2 px-3">
            <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
              {t("Preferences", "Preferensi")}
            </span>
          </div>
          <Link
            href="/insights"
            className="flex items-center gap-3 rounded-xl px-3 py-2 font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
          >
            <HelpCircle className="h-4 w-4" />
            <span>{t("Help & Documentation", "Bantuan & Dokumentasi")}</span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2 font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
          >
            <UserCog className="h-4 w-4" />
            <span>{t("Account Settings", "Pengaturan Akun")}</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2 font-label-md text-label-md text-error transition-all hover:bg-error-container/40 text-left"
          >
            <LogOut className="h-4 w-4" />
            <span>{t("Sign Out", "Keluar")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pl-72">
        <header className="fixed left-72 right-0 top-0 z-40 flex h-16 items-center justify-between bg-surface-container-lowest/90 px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 font-label-md text-label-md text-on-surface">
              <Calendar className="h-4 w-4 text-secondary" />
              <span>{todayFormatted}</span>
              <ChevronDown className="h-4 w-4 text-outline" />
            </div>
            <div className="flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1.5 font-label-md text-label-md text-on-secondary-container">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="font-bold">{balanceScore}/100</span>
              <span className="font-medium text-secondary">
                {t("Balanced", "Seimbang")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <button
              type="button"
              onClick={
                onQuickLogClick || (() => router.push("/schedule"))
              }
              className="flex items-center gap-2 rounded-xl bg-primary-container px-4 py-2 font-label-lg text-label-lg text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-98"
            >
              <Plus className="h-4 w-4" />
              <span>{t("Log Activity", "Catat Aktivitas")}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/wellness")}
              className="relative rounded-lg p-2 text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
              title={t("Wellness Notifications", "Notifikasi Kesehatan")}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />
            </button>
            <Link
              href="/settings"
              className="flex items-center gap-2.5 pl-2 group"
              title={`${session.user.name} (${effectiveRole})`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container font-label-md text-label-md font-bold text-primary ring-2 ring-surface-container-high">
                {initials}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="font-label-md text-label-md font-semibold text-on-surface leading-tight group-hover:text-primary transition-colors">
                  {session.user.name}
                </span>
                <span className="font-label-sm text-label-sm text-secondary leading-tight">
                  {effectiveRole === "ADMIN"
                    ? t("ADMIN", "ADMIN")
                    : t("USER", "PENGGUNA")}
                </span>
              </div>
            </Link>
          </div>
        </header>

        <main className="min-h-screen w-full bg-surface px-8 pt-16">
          <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 pb-16 pt-4">
            {/* Email Verified Celebration Banner */}
            {isVerifiedParam && !verifiedDismissed && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary-container text-on-secondary-container font-label-md text-label-md shadow-xs animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                  <span>
                    {t(
                      "Your email has been verified successfully! Your LifeSync account is fully active.",
                      "Alamat email Anda berhasil diverifikasi! Akun LifeSync Anda aktif sepenuhnya."
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setVerifiedDismissed(true)}
                  className="p-1 rounded-lg text-secondary hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>
            )}

            {/* Email Unverified Reminder Banner */}
            {!isEmailVerified && !isVerifiedParam && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 px-4 rounded-2xl bg-surface-container-lowest border border-primary/20 shadow-xs">
                <div className="flex items-center gap-3">
                  <MailCheck className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                      {t("Verify your email address", "Verifikasi alamat email Anda")}
                    </span>
                    <span className="font-body-sm text-body-sm text-secondary">
                      {emailSentNotice
                        ? t(
                            "Verification link sent to your Gmail inbox! Please check your spam folder if needed.",
                            "Tautan verifikasi telah dikirim ke kotak masuk Gmail Anda! Periksa folder spam jika perlu."
                          )
                        : t(
                            "Please check your Gmail inbox to activate full account features and alerts.",
                            "Silakan periksa kotak masuk Gmail Anda untuk mengaktifkan fitur dan pengingat akun secara lengkap."
                          )}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={resendingEmail}
                  onClick={handleResendVerification}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold hover:opacity-95 transition-all disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {resendingEmail
                      ? t("Sending...", "Mengirim...")
                      : emailSentNotice
                      ? t("Sent!", "Terkirim!")
                      : t("Resend Email", "Kirim Ulang Email")}
                  </span>
                </button>
              </div>
            )}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
