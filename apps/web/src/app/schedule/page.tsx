"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  scheduleBlockSchema,
  type ScheduleBlockInput,
  activityCategorySchema,
  type ActivityCategoryInput,
} from "@lifesync/shared";
import { AppShell } from "@/components/layout/app-shell";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface CategoryItem {
  id: string;
  userId: string | null;
  name: string;
  slug: string;
  color: string;
  bgColor: string;
  icon: string;
  description?: string | null;
  isSystem?: boolean;
  targetMinutesPerDay: number;
}

interface ScheduleBlockItem {
  id: string;
  userId: string;
  activityId: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  crossesMidnight: boolean;
  category: CategoryItem;
}

interface CategoryDistributionItem {
  categoryId: string;
  name: string;
  slug: string;
  color: string;
  bgColor: string;
  icon: string;
  allocatedMinutes: number;
  targetMinutesPerDay: number;
  percentageOfDay: number;
}

interface DailyScheduleSummary {
  date: string;
  totalMinutesInDay: number;
  allocatedMinutes: number;
  remainingMinutes: number;
  allocatedPercentage: number;
  blocks: ScheduleBlockItem[];
  categoryDistribution: CategoryDistributionItem[];
}

interface WellnessTipItem {
  id: string;
  title: string;
  category: string;
  content: string;
  actionLabel: string | null;
  icon: string;
}

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftIsoDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + deltaDays);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, "0");
  const nd = String(dt.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function formatDurationMinutes(mins: number): string {
  const safeMins = Math.max(0, Math.round(mins));
  const hours = Math.floor(safeMins / 60);
  const minutes = safeMins % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h 00m`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatMinutesToHHMM(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDateBanner(
  dateStr: string,
  locale = "en-US",
  todayWord = "Today"
): string {
  const today = getTodayIsoDate();
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
  const formatted = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dt);
  return dateStr === today ? `${todayWord}, ${formatted}` : formatted;
}

interface RibbonSegment {
  id: string;
  type: "block" | "free";
  startMin: number;
  endMin: number;
  widthPct: number;
  block?: ScheduleBlockItem;
}

export default function DailySchedulePage() {
  const { t, locale, translateCategory } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate);
  const [scheduleData, setScheduleData] = useState<DailyScheduleSummary | null>(
    null
  );
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [tips, setTips] = useState<WellnessTipItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState<boolean>(false);
  const [expandDescriptions, setExpandDescriptions] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modal state for Add / Edit Block
  const [blockModalOpen, setBlockModalOpen] = useState<boolean>(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlockItem | null>(
    null
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Modal state for Custom Category creation
  const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Live current time indicator
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchScheduleAndCategories = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const [schedRes, catRes, tipsRes] = await Promise.all([
        apiFetch<DailyScheduleSummary>(`/api/schedules?date=${date}`),
        apiFetch<CategoryItem[]>("/api/activities"),
        apiFetch<WellnessTipItem[]>("/api/tips"),
      ]);

      if (schedRes.success && schedRes.data) {
        setScheduleData(schedRes.data);
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
      if (tipsRes.success && tipsRes.data) {
        setTips(tipsRes.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduleAndCategories(selectedDate);
  }, [selectedDate, fetchScheduleAndCategories]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleBlockInput>({
    resolver: zodResolver(scheduleBlockSchema),
    defaultValues: {
      title: "",
      activityId: "",
      date: selectedDate,
      startTime: "09:00",
      endTime: "10:30",
      description: "",
    },
  });

  const {
    register: registerCategory,
    handleSubmit: handleSubmitCategory,
    reset: resetCategory,
    formState: { errors: categoryErrors, isSubmitting: isSubmittingCategory },
  } = useForm<ActivityCategoryInput>({
    resolver: zodResolver(activityCategorySchema),
    defaultValues: {
      name: "",
      color: "#0d7a53",
      bgColor: "#eef4ff",
      icon: "schedule",
      description: "",
      targetMinutesPerDay: 60,
    },
  });

  const openAddModal = (prefillStart?: string, prefillEnd?: string) => {
    setEditingBlock(null);
    setServerError(null);
    reset({
      title: "",
      activityId: categories[0]?.id ?? "",
      date: selectedDate,
      startTime: prefillStart ?? "09:00",
      endTime: prefillEnd ?? "10:30",
      description: "",
    });
    setBlockModalOpen(true);
  };

  const openEditModal = (block: ScheduleBlockItem) => {
    setEditingBlock(block);
    setServerError(null);
    reset({
      title: block.title,
      activityId: block.activityId,
      date: block.date,
      startTime: block.startTime,
      endTime: block.endTime,
      description: block.description ?? "",
    });
    setBlockModalOpen(true);
  };

  const onSubmitBlock = async (values: ScheduleBlockInput) => {
    setServerError(null);
    if (editingBlock) {
      const res = await apiFetch<ScheduleBlockItem>(
        `/api/schedules/${editingBlock.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(values),
        }
      );

      if (!res.success) {
        setServerError(
          res.error?.message || "Failed to update activity block."
        );
        return;
      }
      setActionFeedback(`Updated "${values.title}"`);
    } else {
      const res = await apiFetch<ScheduleBlockItem>("/api/schedules", {
        method: "POST",
        body: JSON.stringify(values),
      });

      if (!res.success) {
        setServerError(
          res.error?.message || "Failed to schedule activity block."
        );
        return;
      }
      setActionFeedback(`Scheduled "${values.title}"`);
    }

    setBlockModalOpen(false);
    setEditingBlock(null);
    await fetchScheduleAndCategories(selectedDate);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleDeleteBlock = async (block: ScheduleBlockItem) => {
    const res = await apiFetch<{ id: string; deleted: boolean }>(
      `/api/schedules/${block.id}`,
      {
        method: "DELETE",
      }
    );
    if (res.success) {
      setActionFeedback(`Removed "${block.title}"`);
      await fetchScheduleAndCategories(selectedDate);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  const handleSplitBlock = async (block: ScheduleBlockItem) => {
    if (block.durationMinutes < 30) {
      setActionFeedback("Block must be at least 30 minutes to split.");
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }

    const halfDuration = Math.floor(block.durationMinutes / 2);
    const midMinutes = block.startMinutes + halfDuration;
    const midTimeStr = formatMinutesToHHMM(midMinutes);

    // 1. Shorten existing block to first half
    const updateRes = await apiFetch<ScheduleBlockItem>(
      `/api/schedules/${block.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          title: `${block.title} (Part 1)`,
          endTime: midTimeStr,
        }),
      }
    );

    if (!updateRes.success) {
      setActionFeedback(
        updateRes.error?.message || "Could not split schedule block."
      );
      return;
    }

    // 2. Create second half block
    const createRes = await apiFetch<ScheduleBlockItem>("/api/schedules", {
      method: "POST",
      body: JSON.stringify({
        title: `${block.title} (Part 2)`,
        activityId: block.activityId,
        date: block.date,
        startTime: midTimeStr,
        endTime: block.endTime,
        description: block.description,
      }),
    });

    if (createRes.success) {
      setActionFeedback(`Split "${block.title}" into two contiguous blocks`);
      await fetchScheduleAndCategories(selectedDate);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  const onSubmitCustomCategory = async (values: ActivityCategoryInput) => {
    setCategoryError(null);
    const res = await apiFetch<CategoryItem>("/api/activities", {
      method: "POST",
      body: JSON.stringify(values),
    });

    if (!res.success) {
      setCategoryError(res.error?.message || "Failed to create category.");
      return;
    }

    setCategoryModalOpen(false);
    resetCategory();
    await fetchScheduleAndCategories(selectedDate);
    setActionFeedback(`Category "${values.name}" created`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Build continuous 24-Hour Circadian Ribbon segments across [0, 1440]
  const ribbonSegments = useMemo<RibbonSegment[]>(() => {
    const blocks = scheduleData?.blocks ?? [];
    const intervals: Array<{
      startMin: number;
      endMin: number;
      block: ScheduleBlockItem;
    }> = [];

    for (const block of blocks) {
      if (block.crossesMidnight) {
        const rawEnd = block.endMinutes - 1440;
        if (block.startMinutes < 1440) {
          intervals.push({
            startMin: block.startMinutes,
            endMin: 1440,
            block,
          });
        }
        if (rawEnd > 0) {
          intervals.push({
            startMin: 0,
            endMin: rawEnd,
            block,
          });
        }
      } else {
        intervals.push({
          startMin: block.startMinutes,
          endMin: block.endMinutes,
          block,
        });
      }
    }

    intervals.sort((a, b) => a.startMin - b.startMin);

    const segments: RibbonSegment[] = [];
    let cursor = 0;

    for (const item of intervals) {
      if (item.startMin > cursor) {
        const gap = item.startMin - cursor;
        segments.push({
          id: `free_${cursor}_${item.startMin}`,
          type: "free",
          startMin: cursor,
          endMin: item.startMin,
          widthPct: (gap / 1440) * 100,
        });
      }
      const span = Math.max(0, item.endMin - item.startMin);
      if (span > 0) {
        segments.push({
          id: `blk_${item.block.id}_${item.startMin}`,
          type: "block",
          startMin: item.startMin,
          endMin: item.endMin,
          widthPct: (span / 1440) * 100,
          block: item.block,
        });
      }
      cursor = Math.max(cursor, item.endMin);
    }

    if (cursor < 1440) {
      const gap = 1440 - cursor;
      segments.push({
        id: `free_${cursor}_1440`,
        type: "free",
        startMin: cursor,
        endMin: 1440,
        widthPct: (gap / 1440) * 100,
      });
    }

    return segments;
  }, [scheduleData]);

  // Suggest next open buffer window for "Auto-balance Day" or quick slot fill
  const handleFillNextBuffer = () => {
    const firstFree = ribbonSegments.find(
      (s) => s.type === "free" && s.endMin - s.startMin >= 30
    );
    if (!firstFree) {
      openAddModal();
      return;
    }
    const startStr = formatMinutesToHHMM(firstFree.startMin);
    const suggestedEndMin = Math.min(firstFree.endMin, firstFree.startMin + 90);
    const endStr =
      suggestedEndMin === 1440
        ? "00:00"
        : formatMinutesToHHMM(suggestedEndMin);
    openAddModal(startStr, endStr);
  };

  const filteredBlocks = useMemo(() => {
    const raw = scheduleData?.blocks ?? [];
    const byCategory =
      selectedCategoryId === "ALL"
        ? raw
        : raw.filter((b) => b.activityId === selectedCategoryId);

    return [...byCategory].sort((a, b) =>
      sortOrder === "asc"
        ? a.startMinutes - b.startMinutes
        : b.startMinutes - a.startMinutes
    );
  }, [scheduleData, selectedCategoryId, sortOrder]);

  // Calculate Circadian Harmony score based on allocated goals
  const circadianHarmonyScore = useMemo(() => {
    if (!scheduleData || scheduleData.blocks.length === 0) return 75;
    const allocatedRatio = Math.min(1, scheduleData.allocatedMinutes / 1080);
    const sleepCat = scheduleData.categoryDistribution.find(
      (c) => c.slug === "sleep"
    );
    const sleepRatio = sleepCat
      ? Math.min(1, sleepCat.allocatedMinutes / 450)
      : 0.5;
    return Math.round(60 + allocatedRatio * 22 + sleepRatio * 18);
  }, [scheduleData]);

  const watchStart = watch("startTime");
  const watchEnd = watch("endTime");
  const previewDuration = useMemo(() => {
    if (!watchStart || !watchEnd) return null;
    const [sh, sm] = watchStart.split(":").map(Number);
    const [eh, em] = watchEnd.split(":").map(Number);
    if (
      sh === undefined ||
      sm === undefined ||
      eh === undefined ||
      em === undefined ||
      Number.isNaN(sh) ||
      Number.isNaN(sm) ||
      Number.isNaN(eh) ||
      Number.isNaN(em)
    ) {
      return null;
    }
    const startM = sh * 60 + sm;
    const rawEndM = eh * 60 + em;
    if (startM === rawEndM) return "Invalid (0m)";
    const duration =
      rawEndM > startM
        ? rawEndM - startM
        : rawEndM === 0
          ? 1440 - startM
          : rawEndM + 1440 - startM;
    const crosses = rawEndM > 0 && rawEndM < startM;
    return `${formatDurationMinutes(duration)}${crosses ? " • Crosses midnight" : ""}`;
  }, [watchStart, watchEnd]);

  const activeTip = tips[0] ?? {
    title: "Circadian Optimization Tip",
    content:
      "Leave natural buffer windows between high-cognition afternoon work and evening meals to lower cortisol spikes before sleep.",
    actionLabel: "Learn more about pacing",
  };

  const livePercent = Number(((nowMinutes / 1440) * 100).toFixed(2));
  const isTodaySelected = selectedDate === getTodayIsoDate();

  return (
    <AppShell
      onQuickLogClick={() => openAddModal()}
      selectedDateLabel={formatDateBanner(
        selectedDate,
        locale,
        t("Today", "Hari Ini")
      )}
      balanceScore={circadianHarmonyScore}
    >
      <div className="flex flex-col w-full">
        {/* Top Command & Navigation Bar */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-4 px-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Navigator */}
            <div className="flex items-center bg-surface-container-lowest p-1 rounded-xl shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedDate((d) => shiftIsoDate(d, -1))}
                className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
                title={t("Previous Day", "Hari Sebelumnya")}
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_left
                </span>
              </button>

              <label className="relative px-4 py-1.5 font-label-lg text-label-lg text-on-surface hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                <span>
                  {formatDateBanner(
                    selectedDate,
                    locale,
                    t("Today", "Hari Ini")
                  )}
                </span>
                {isTodaySelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={() => setSelectedDate((d) => shiftIsoDate(d, 1))}
                className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
                title={t("Next Day", "Hari Berikutnya")}
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_right
                </span>
              </button>

              {!isTodaySelected && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayIsoDate())}
                  className="ml-1 px-2.5 py-1 rounded-lg bg-secondary-container/60 text-primary font-label-sm text-label-sm font-semibold hover:bg-secondary-container transition-colors"
                >
                  {t("Today", "Hari Ini")}
                </button>
              )}
            </div>

            {/* Allocation Pill Metric */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-surface-container-lowest rounded-xl shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  timelapse
                </span>
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  {formatDurationMinutes(scheduleData?.allocatedMinutes ?? 0)}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  / 24h 00m
                </span>
              </div>
              <span className="w-1 h-1 rounded-full bg-outline-variant" />
              <span className="font-label-sm text-label-sm text-primary font-medium bg-secondary-container/40 px-2 py-0.5 rounded-md">
                {formatDurationMinutes(scheduleData?.remainingMinutes ?? 1440)}{" "}
                {t("free space", "waktu luang")}
              </span>
            </div>

            {actionFeedback && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary-container text-on-secondary-container font-label-md text-label-md shadow-sm">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  check_circle
                </span>
                <span>{actionFeedback}</span>
              </div>
            )}
          </div>

          {/* Quick Action Cluster */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterDropdownOpen((o) => !o)}
                className="flex items-center gap-2 px-3.5 py-2 bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-label-md text-label-md rounded-xl shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">
                  tune
                </span>
                <span>
                  {selectedCategoryId === "ALL"
                    ? t("Filter Categories", "Filter Kategori")
                    : translateCategory(
                        categories.find((c) => c.id === selectedCategoryId)
                          ?.name || t("Filtered", "Terfilter")
                      )}
                </span>
                <span className="material-symbols-outlined text-[16px] text-outline">
                  expand_more
                </span>
              </button>

              {filterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-surface-container-lowest shadow-xl border border-surface-container-high p-2 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId("ALL");
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-label-md text-label-md transition-colors ${
                      selectedCategoryId === "ALL"
                        ? "bg-secondary-container text-primary font-bold"
                        : "text-on-surface hover:bg-surface-container-low"
                    }`}
                  >
                    <span>{t("All Categories", "Semua Kategori")}</span>
                    <span className="text-xs text-outline">
                      {scheduleData?.blocks.length ?? 0}
                    </span>
                  </button>
                  <div className="my-1 border-t border-surface-container-low" />
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setFilterDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-label-md text-label-md transition-colors ${
                          selectedCategoryId === cat.id
                            ? "bg-secondary-container text-primary font-bold"
                            : "text-on-surface hover:bg-surface-container-low"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span>{translateCategory(cat.name)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="my-1 border-t border-surface-container-low" />
                  <button
                    type="button"
                    onClick={() => {
                      setFilterDropdownOpen(false);
                      setCategoryModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl font-label-md text-label-md text-primary font-semibold hover:bg-surface-container-low transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      add_circle
                    </span>
                    <span>
                      {t("New Custom Category", "Kategori Kustom Baru")}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Auto-Balance / Fill Open Window Action */}
            <button
              type="button"
              onClick={handleFillNextBuffer}
              className="flex items-center gap-2 px-3.5 py-2 bg-secondary-container hover:bg-secondary-fixed text-on-secondary-container font-label-md text-label-md rounded-xl transition-all shadow-sm"
              title={t(
                "Schedule into next available unallocated window",
                "Jadwalkan pada jendela waktu kosong berikutnya"
              )}
            >
              <span className="material-symbols-outlined text-[18px] text-primary">
                auto_fix_high
              </span>
              <span>{t("Auto-balance Day", "Seimbangkan Hari")}</span>
            </button>

            {/* Primary Add Block */}
            <button
              type="button"
              onClick={() => openAddModal()}
              className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary hover:opacity-95 active:scale-98 rounded-xl font-label-lg text-label-lg shadow-[0_4px_14px_rgba(13,122,83,0.18)] transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>{t("Add Block", "Tambah Blok")}</span>
            </button>
          </div>
        </section>

        {/* 24-Hour Panoramic Visualizer Strip */}
        <section className="mb-8">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-3">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
                  {t("24-Hour Circadian Ribbon", "Pita Sirkadian 24 Jam")}
                </span>
                <span className="font-label-sm text-label-sm px-2.5 py-0.5 bg-surface-container-low text-secondary font-semibold uppercase tracking-wider rounded-full">
                  {scheduleData?.allocatedPercentage ?? 0}%{" "}
                  {t("Allocated", "Terjadwal")}
                </span>
              </div>

              <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>
                  {t("Live Indicator", "Indikator Waktu")}:{" "}
                  <strong>{formatMinutesToHHMM(nowMinutes)}</strong>
                </span>
              </div>
            </div>

            {/* Phase Segments Labeling Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 pb-2 text-center font-label-sm text-label-sm text-on-surface-variant font-medium">
              <div className="flex items-center gap-1.5 justify-start pl-1 text-secondary">
                <span className="material-symbols-outlined text-[16px]">
                  bedtime
                </span>{" "}
                {t("Night (00:00 - 06:00)", "Malam (00:00 - 06:00)")}
              </div>
              <div className="flex items-center gap-1.5 justify-start sm:pl-4 text-primary">
                <span className="material-symbols-outlined text-[16px]">
                  wb_twilight
                </span>{" "}
                {t("Morning (06:00 - 12:00)", "Pagi (06:00 - 12:00)")}
              </div>
              <div className="flex items-center gap-1.5 justify-start sm:pl-4 text-secondary">
                <span className="material-symbols-outlined text-[16px]">
                  wb_sunny
                </span>{" "}
                {t("Afternoon (12:00 - 18:00)", "Siang (12:00 - 18:00)")}
              </div>
              <div className="flex items-center gap-1.5 justify-end pr-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">
                  nights_stay
                </span>{" "}
                {t("Evening (18:00 - 24:00)", "Petang (18:00 - 24:00)")}
              </div>
            </div>

            {/* Panoramic Bar Container */}
            <div className="relative w-full h-12 bg-surface-container-high rounded-xl overflow-hidden flex shadow-inner">
              {ribbonSegments.map((seg) => {
                if (seg.type === "free") {
                  return (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() =>
                        openAddModal(
                          formatMinutesToHHMM(seg.startMin),
                          seg.endMin === 1440
                            ? "00:00"
                            : formatMinutesToHHMM(seg.endMin)
                        )
                      }
                      style={{ width: `${seg.widthPct}%` }}
                      title={`Unallocated Window: ${formatMinutesToHHMM(seg.startMin)} - ${seg.endMin === 1440 ? "24:00" : formatMinutesToHHMM(seg.endMin)} (${formatDurationMinutes(seg.endMin - seg.startMin)}) — Click to schedule`}
                      className="h-full bg-surface-container-low/90 hover:bg-surface-container text-on-surface-variant flex items-center justify-center border-r border-dashed border-outline-variant/40 transition-all overflow-hidden"
                    >
                      {seg.widthPct >= 6 && (
                        <span className="font-label-sm text-label-sm text-outline truncate px-1">
                          Free ({formatDurationMinutes(seg.endMin - seg.startMin)})
                        </span>
                      )}
                    </button>
                  );
                }

                const block = seg.block!;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => openEditModal(block)}
                    style={{
                      width: `${seg.widthPct}%`,
                      backgroundColor: block.category.color,
                    }}
                    title={`${block.title} (${block.category.name}): ${block.startTime} - ${block.endTime} (${formatDurationMinutes(block.durationMinutes)})`}
                    className="h-full text-white flex items-center justify-center relative cursor-pointer hover:brightness-110 transition-all border-r border-white/15 overflow-hidden"
                  >
                    <span className="font-label-sm text-label-sm truncate px-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        {block.category.icon || "schedule"}
                      </span>
                      {seg.widthPct >= 7 && (
                        <span className="truncate">{block.title}</span>
                      )}
                    </span>
                  </button>
                );
              })}

              {/* Live scrub vertical needle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-error z-20 pointer-events-none shadow-[0_0_8px_rgba(186,26,26,0.6)]"
                style={{ left: `${livePercent}%` }}
              >
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-error ring-2 ring-surface-container-lowest" />
              </div>
            </div>

            {/* Linear Tick Hour Indicators (00 to 24) */}
            <div className="flex justify-between items-center pt-2 text-[10px] text-on-surface-variant font-medium px-1 select-none">
              <span>00:00</span>
              <span>02:00</span>
              <span>04:00</span>
              <span>06:00</span>
              <span>08:00</span>
              <span>10:00</span>
              <span className="text-primary font-bold">12:00</span>
              <span>14:00</span>
              <span>16:00</span>
              <span>18:00</span>
              <span>20:00</span>
              <span>22:00</span>
              <span>24:00</span>
            </div>
          </div>
        </section>

        {/* Two Column Layout: Main Schedule (Left 8 cols) + Right Analytics Panel (Right 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Timeline Block View (8 Columns) */}
          <section className="lg:col-span-8 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {t("Scheduled Sequence", "Urutan Terjadwal")}
                </span>
                <span className="font-label-md text-label-md px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                  {filteredBlocks.length}{" "}
                  {filteredBlocks.length === 1
                    ? t("block", "blok")
                    : t("blocks", "blok")}
                </span>
              </div>

              <div className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant">
                <button
                  type="button"
                  onClick={() =>
                    setSortOrder((s) => (s === "asc" ? "desc" : "asc"))
                  }
                  className="px-2.5 py-1 rounded-lg hover:bg-surface-container-low text-on-surface transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    swap_vert
                  </span>
                  <span>
                    {sortOrder === "asc"
                      ? t("Earliest First", "Paling Awal")
                      : t("Latest First", "Paling Akhir")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandDescriptions((e) => !e)}
                  className="px-2.5 py-1 rounded-lg hover:bg-surface-container-low text-on-surface transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {expandDescriptions ? "unfold_less" : "expand"}
                  </span>
                  <span>
                    {expandDescriptions
                      ? t("Compact View", "Tampilan Ringkas")
                      : t("Expand All", "Perluas Semua")}
                  </span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-20 rounded-xl bg-surface-container-lowest p-4 shadow-sm animate-pulse flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-low" />
                      <div className="space-y-2">
                        <div className="h-4 w-48 rounded bg-surface-container-low" />
                        <div className="h-3 w-32 rounded bg-surface-container-low" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBlocks.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl p-10 text-center shadow-sm border border-dashed border-outline-variant/50 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary-container/60 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px]">
                    schedule
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  {t(
                    "No Scheduled Activities for This Window",
                    "Belum Ada Aktivitas Terjadwal untuk Hari Ini"
                  )}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
                  {t("Your 24-hour canvas has", "Kanvas 24 jam Anda memiliki")}{" "}
                  <strong>
                    {formatDurationMinutes(
                      scheduleData?.remainingMinutes ?? 1440
                    )}
                  </strong>{" "}
                  {t(
                    "of unallocated space. Organize your sleep, deep work, exercise, meals, and restorative buffers without overlaps.",
                    "waktu luang. Atur tidur, kerja fokus, olahraga, makan, dan istirahat Anda tanpa tumpang tindih."
                  )}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => openAddModal("07:00", "08:00")}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary-container text-on-primary rounded-xl font-label-lg text-label-lg shadow-sm hover:opacity-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      add
                    </span>
                    <span>
                      {t("Schedule First Block", "Jadwalkan Blok Pertama")}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              filteredBlocks.map((block) => {
                const isCurrentBlock =
                  isTodaySelected &&
                  ((!block.crossesMidnight &&
                    nowMinutes >= block.startMinutes &&
                    nowMinutes < block.endMinutes) ||
                    (block.crossesMidnight &&
                      (nowMinutes >= block.startMinutes ||
                        nowMinutes < block.endMinutes - 1440)));

                return (
                  <div
                    key={block.id}
                    className={`group relative flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-all ${
                      isCurrentBlock
                        ? "border-l-4 border-l-primary shadow-md"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: block.category.color }}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {block.category.icon || "schedule"}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            {block.title}
                          </span>
                          <span
                            className="font-label-sm text-label-sm px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: block.category.bgColor,
                              color: block.category.color,
                            }}
                          >
                            {translateCategory(block.category.name)}
                          </span>
                          {isCurrentBlock && (
                            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-semibold animate-pulse">
                              {t("In Progress", "Sedang Berlangsung")}
                            </span>
                          )}
                          {block.crossesMidnight && (
                            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-secondary font-medium">
                              {t("Crosses Midnight", "Melewati Tengah Malam")}
                            </span>
                          )}
                        </div>

                        <div className="font-body-sm text-body-sm text-on-surface-variant flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="font-medium text-on-surface">
                            {block.startTime} - {block.endTime}
                          </span>
                          <span>•</span>
                          <span>
                            {formatDurationMinutes(block.durationMinutes)}
                          </span>
                          {expandDescriptions && block.description && (
                            <>
                              <span>•</span>
                              <span className="text-secondary font-medium truncate max-w-md">
                                {block.description}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-85 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSplitBlock(block)}
                        className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
                        title={t("Split Block in Half", "Bagi Blok Menjadi Dua")}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          vertical_split
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(block)}
                        className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
                        title={t("Edit Block", "Ubah Blok")}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          edit
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(block)}
                        className="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
                        title={t("Delete Block", "Hapus Blok")}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {/* Side Panel: Category Breakdown & Weekly Targets (4 Columns) */}
          <aside className="lg:col-span-4 flex flex-col gap-6 sticky top-20">
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    {t("Category Goals", "Target Kategori")}
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    {t(
                      "Daily target pace for optimal vitality",
                      "Target harian untuk vitalitas optimal"
                    )}
                  </p>
                </div>
                <span className="material-symbols-outlined text-primary text-[24px]">
                  donut_large
                </span>
              </div>

              <div className="flex flex-col gap-4 mt-6">
                {(scheduleData?.categoryDistribution ?? [])
                  .filter(
                    (cat) =>
                      cat.allocatedMinutes > 0 ||
                      ["sleep", "work", "exercise", "personal-time", "meals"].includes(
                        cat.slug
                      )
                  )
                  .slice(0, 6)
                  .map((cat) => {
                    const target = Math.max(30, cat.targetMinutesPerDay || 60);
                    const pct = Math.min(
                      100,
                      Math.round((cat.allocatedMinutes / target) * 100)
                    );
                    const diff = cat.allocatedMinutes - target;

                    return (
                      <div key={cat.categoryId}>
                        <div className="flex justify-between items-center mb-1.5 font-label-md text-label-md">
                          <span className="flex items-center gap-2 text-on-surface">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span>{translateCategory(cat.name)}</span>
                          </span>
                          <span className="text-on-surface-variant font-medium">
                            {formatDurationMinutes(cat.allocatedMinutes)}{" "}
                            <span className="text-outline">
                              / {formatDurationMinutes(target)}
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: cat.color,
                            }}
                          />
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-medium mt-1 inline-block">
                          {diff >= 0
                            ? `${
                                diff === 0
                                  ? t("100% on target limit", "100% sesuai target")
                                  : `+${formatDurationMinutes(diff)} ${t("allocated", "teralokasi")}`
                              }`
                            : `${formatDurationMinutes(Math.abs(diff))} ${t("remaining to target", "menuju target")}`}
                        </span>
                      </div>
                    );
                  })}
              </div>

              {/* Circadian Harmony Score Card */}
              <div className="mt-6 p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold">
                    {t("Circadian Harmony", "Harmoni Sirkadian")}
                  </span>
                  <div className="font-headline-sm text-headline-sm font-bold text-on-surface mt-0.5">
                    {circadianHarmonyScore} / 100
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
                  <span className="material-symbols-outlined text-[26px]">
                    eco
                  </span>
                </div>
              </div>
            </div>

            {/* Mindful Scheduling Tip */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-secondary-container text-on-secondary-container shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    lightbulb
                  </span>
                </div>
                <div>
                  <h3 className="font-label-lg text-label-lg text-on-surface font-semibold">
                    {activeTip.title}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
                    {activeTip.content}
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleFillNextBuffer}
                      className="font-label-sm text-label-sm text-primary font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <span>
                        {activeTip.actionLabel ||
                          t("Schedule buffer block", "Jadwalkan blok jeda")}
                      </span>
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Biophilic Ambient Card */}
            <div className="relative w-full h-36 rounded-xl overflow-hidden shadow-sm bg-gradient-to-br from-primary via-primary-container to-secondary p-5 flex flex-col justify-between text-on-primary">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed font-semibold">
                  {t("Environment Sync", "Sinkronisasi Lingkungan")}
                </span>
                <span className="material-symbols-outlined text-[20px] text-primary-fixed">
                  wb_twilight
                </span>
              </div>
              <div>
                <div className="font-label-lg text-label-lg font-bold">
                  {t("Natural Daylight Rhythms", "Ritme Cahaya Siang Alami")}
                </div>
                <p className="font-body-sm text-body-sm text-on-primary/80 mt-0.5">
                  {formatDurationMinutes(scheduleData?.remainingMinutes ?? 1440)}{" "}
                  {t(
                    "open recovery buffer remaining today",
                    "waktu pemulihan luang tersisa hari ini"
                  )}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Add / Edit Schedule Block Modal */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-surface-container-lowest p-7 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">
                    more_time
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    {editingBlock
                      ? t("Edit Activity Block", "Ubah Blok Aktivitas")
                      : t("Schedule Activity Block", "Jadwalkan Blok Aktivitas")}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {t(
                      "Non-overlapping 24-hour time allocation",
                      "Alokasi waktu 24 jam tanpa tumpang tindih"
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlockModalOpen(false)}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {serverError && (
              <div className="mt-4 rounded-xl bg-error-container/80 px-4 py-3 text-on-error-container font-body-sm text-body-sm flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-error shrink-0 mt-0.5">
                  error
                </span>
                <span>{serverError}</span>
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmitBlock)}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                  {t("Activity Title", "Judul Aktivitas")}
                </label>
                <input
                  type="text"
                  placeholder={t(
                    "e.g., Deep Work & Architecture Sprint",
                    "mis., Kerja Fokus & Perencanaan Sistem"
                  )}
                  {...register("title")}
                  className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none border border-transparent focus:border-primary transition-all"
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-error">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                    {t("Category", "Kategori")}
                  </label>
                  <select
                    {...register("activityId")}
                    className="w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 font-body-md text-body-md text-on-surface outline-none border border-transparent focus:border-primary transition-all"
                  >
                    <option value="">
                      {t("Select category...", "Pilih kategori...")}
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {translateCategory(cat.name)}
                      </option>
                    ))}
                  </select>
                  {errors.activityId && (
                    <p className="mt-1 text-xs text-error">
                      {errors.activityId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                    {t("Date", "Tanggal")}
                  </label>
                  <input
                    type="date"
                    {...register("date")}
                    className="w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 font-body-md text-body-md text-on-surface outline-none border border-transparent focus:border-primary transition-all"
                  />
                  {errors.date && (
                    <p className="mt-1 text-xs text-error">
                      {errors.date.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                    {t("Start Time (24h)", "Waktu Mulai (24j)")}
                  </label>
                  <input
                    type="time"
                    {...register("startTime")}
                    className="w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 font-body-md text-body-md text-on-surface outline-none border border-transparent focus:border-primary transition-all"
                  />
                  {errors.startTime && (
                    <p className="mt-1 text-xs text-error">
                      {errors.startTime.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                    {t("End Time (24h)", "Waktu Selesai (24j)")}
                  </label>
                  <input
                    type="time"
                    {...register("endTime")}
                    className="w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 font-body-md text-body-md text-on-surface outline-none border border-transparent focus:border-primary transition-all"
                  />
                  {errors.endTime && (
                    <p className="mt-1 text-xs text-error">
                      {errors.endTime.message}
                    </p>
                  )}
                </div>
              </div>

              {previewDuration && (
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm">
                  <span>
                    {t("Calculated Block Duration", "Estimasi Durasi Blok")}
                  </span>
                  <span className="font-bold text-primary">
                    {previewDuration}
                  </span>
                </div>
              )}

              <div>
                <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                  {t("Notes / Intention (Optional)", "Catatan / Intensi (Opsional)")}
                </label>
                <textarea
                  rows={2}
                  placeholder={t(
                    "e.g., Zero-screen outdoor walk, Zone 2 heart rate, or key deliverable...",
                    "mis., Jalan kaki tanpa layar, detak jantung Zona 2, atau target kerja utama..."
                  )}
                  {...register("description")}
                  className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body-sm text-body-sm text-on-surface outline-none border border-transparent focus:border-primary transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container-low">
                <button
                  type="button"
                  onClick={() => setBlockModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  {t("Cancel", "Batal")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-md hover:bg-primary-container disabled:opacity-50 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    check
                  </span>
                  <span>
                    {isSubmitting
                      ? t("Saving...", "Menyimpan...")
                      : editingBlock
                        ? t("Update Block", "Perbarui Blok")
                        : t("Save Block", "Simpan Blok")}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Custom Category Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface-container-lowest p-7 shadow-2xl border border-surface-container-high">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container-low">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {t("New Activity Category", "Kategori Aktivitas Baru")}
              </h3>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {categoryError && (
              <div className="mt-4 rounded-xl bg-error-container/80 px-4 py-2.5 text-on-error-container font-body-sm text-body-sm">
                {categoryError}
              </div>
            )}

            <form
              onSubmit={handleSubmitCategory(onSubmitCustomCategory)}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1">
                  {t("Category Name", "Nama Kategori")}
                </label>
                <input
                  type="text"
                  placeholder={t(
                    "e.g., Mindfulness & Breathwork",
                    "mis., Meditasi & Pernapasan"
                  )}
                  {...registerCategory("name")}
                  className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none"
                />
                {categoryErrors.name && (
                  <p className="mt-1 text-xs text-error">
                    {categoryErrors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1">
                    {t("Accent Color", "Warna Aksen")}
                  </label>
                  <input
                    type="color"
                    {...registerCategory("color")}
                    className="w-full h-10 rounded-xl bg-surface-container-low p-1 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1">
                    {t("Daily Goal (mins)", "Target Harian (mnt)")}
                  </label>
                  <input
                    type="number"
                    {...registerCategory("targetMinutesPerDay", {
                      valueAsNumber: true,
                    })}
                    className="w-full rounded-xl bg-surface-container-low px-3.5 py-2 font-body-md text-body-md text-on-surface outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-container-low">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-label-md text-label-md text-on-surface-variant"
                >
                  {t("Cancel", "Batal")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCategory}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold"
                >
                  {isSubmittingCategory
                    ? t("Creating...", "Membuat...")
                    : t("Create Category", "Buat Kategori")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

