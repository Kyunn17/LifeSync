"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  userRole?: "USER" | "ADMIN";
  onQuickLogClick?: () => void;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Daily Schedule", href: "/schedule", icon: Clock },
  { label: "Wellness Tracking", href: "/wellness", icon: Activity },
  { label: "Insights & Patterns", href: "/insights", icon: Sparkles },
  { label: "Settings", href: "/settings", icon: SlidersHorizontal },
];

export function AppShell({
  children,
  userRole = "USER",
  onQuickLogClick,
}: AppShellProps) {
  const pathname = usePathname();

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
      {/* Left Fixed Sidebar matching Stitch design */}
      <aside className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col justify-between bg-surface-container-lowest py-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col">
          <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary-container text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-primary">
              LifeSync
            </span>
          </Link>

          <div className="mb-3 px-4">
            <span className="px-3 font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
              Overview
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

            {userRole === "ADMIN" && (
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
                <span>Admin Console</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-1 px-4">
          <div className="mb-2 px-3">
            <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
              Preferences
            </span>
          </div>
          <Link
            href="/insights"
            className="flex items-center gap-3 rounded-xl px-3 py-2 font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Help & Documentation</span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2 font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
          >
            <UserCog className="h-4 w-4" />
            <span>Account Settings</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pl-72">
        <header className="fixed left-72 right-0 top-0 z-40 flex h-16 items-center justify-between bg-surface-container-lowest/90 px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 font-label-md text-label-md text-on-surface">
              <Calendar className="h-4 w-4 text-secondary" />
              <span>Today, {todayFormatted}</span>
              <ChevronDown className="h-4 w-4 text-outline" />
            </div>
            <div className="flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1.5 font-label-md text-label-md text-on-secondary-container">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="font-bold">24h Sync</span>
              <span className="font-medium text-secondary">Balanced</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onQuickLogClick}
              className="flex items-center gap-2 rounded-xl bg-primary-container px-4 py-2 font-label-lg text-label-lg text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-98"
            >
              <Plus className="h-4 w-4" />
              <span>Log Activity</span>
            </button>
            <button
              type="button"
              className="relative rounded-lg p-2 text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />
            </button>
          </div>
        </header>

        <main className="min-h-screen w-full bg-surface px-8 pt-16">
          <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-8 pb-16 pt-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

