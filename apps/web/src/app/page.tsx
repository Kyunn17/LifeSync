import Link from "next/link";
import { DEFAULT_ACTIVITY_CATEGORIES } from "@lifesync/shared";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-gutter-mobile lg:px-margin flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-xl bg-secondary-container p-1.5 flex items-center justify-center shadow-2xs">
              <img
                src="/favicon.png"
                alt="LifeSync Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface leading-none">
                LifeSync
              </span>
              <span className="font-label-sm text-label-sm text-secondary tracking-widest uppercase mt-0.5">
                Wellness
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md shadow-sm hover:bg-primary transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-28 pb-16 px-gutter-mobile lg:px-margin max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase tracking-wider w-fit">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              24-Hour Circadian Stewardship
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              Harmonize your 24 hours with your inner biological clock.
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
              LifeSync Wellness helps you allocate your daily 24 hours intentionally, track sleep, exercise, hydration, and daily mood, and uncover actionable lifestyle insights.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/register"
                className="px-6 py-3.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:bg-primary-container transition-all flex items-center gap-2"
              >
                <span>Begin Your 24-Hour Balance</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/login"
                className="px-6 py-3.5 rounded-xl bg-surface-container-lowest text-on-surface font-label-lg text-label-lg shadow-sm hover:bg-surface-container-low transition-all"
              >
                Sign In to Dashboard
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 bg-surface-container-lowest rounded-3xl p-7 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                10 Core Lifestyle Pillars
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm font-bold">
                24h Framework
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {DEFAULT_ACTIVITY_CATEGORIES.map((category) => (
                <div
                  key={category.slug}
                  className="p-3 rounded-xl bg-surface-container-low/60 flex items-center gap-2.5"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      {category.name}
                    </span>
                    <span className="font-body-sm text-body-sm text-secondary">
                      {Math.round((category.targetMinutesPerDay / 60) * 10) / 10}h target
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

