"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useSession } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface PlatformStats {
  totalRegisteredUsers: number;
  activeSessionUsers: number;
  adminUsersCount: number;
  suspendedUsersCount: number;
  totalCategoriesCount: number;
  totalScheduledBlocksCount: number;
  totalWellnessTipsCount: number;
}

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "USER" | "ADMIN";
  banned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminCategoryItem {
  id: string;
  userId: string | null;
  name: string;
  slug: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string | null;
  isSystem: boolean;
  targetMinutesPerDay: number;
}

interface AdminTipItem {
  id: string;
  title: string;
  category: string;
  content: string;
  actionLabel: string | null;
  icon: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const { t, locale, translateCategory } = useLanguage();
  const currentUserRole =
    ((session?.user as { role?: "USER" | "ADMIN" } | undefined)?.role ??
      "USER");

  const [activeTab, setActiveTab] = useState<"users" | "categories" | "tips">(
    "users"
  );
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [tips, setTips] = useState<AdminTipItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New Category Form State
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#0d7a53");
  const [catBgColor, setCatBgColor] = useState("#eef4ff");
  const [catIcon, setCatIcon] = useState("schedule");
  const [catTargetMins, setCatTargetMins] = useState(60);
  const [catDescription, setCatDescription] = useState("");

  // New Wellness Tip Form State
  const [tipTitle, setTipTitle] = useState("");
  const [tipCategory, setTipCategory] = useState("Circadian Reset");
  const [tipContent, setTipContent] = useState("");
  const [tipActionLabel, setTipActionLabel] = useState("");
  const [tipIcon, setTipIcon] = useState("lightbulb");

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setForbiddenError(null);
    try {
      const [usersRes, catsRes, tipsRes] = await Promise.all([
        apiFetch<{ stats: PlatformStats; users: AdminUserItem[] }>(
          "/api/admin/users"
        ),
        apiFetch<AdminCategoryItem[]>("/api/admin/categories"),
        apiFetch<AdminTipItem[]>("/api/admin/tips"),
      ]);

      if (!usersRes.success) {
        setForbiddenError(
          usersRes.error?.message ||
            t(
              "Administrator privileges are required to access this console.",
              "Hak akses Administrator diperlukan untuk membuka konsol ini."
            )
        );
        return;
      }

      if (usersRes.data) {
        setStats(usersRes.data.stats);
        setUsers(usersRes.data.users);
      }
      if (catsRes.success && catsRes.data) {
        setCategories(catsRes.data);
      }
      if (tipsRes.success && tipsRes.data) {
        setTips(tipsRes.data);
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const showNotice = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleToggleUserRole = async (u: AdminUserItem) => {
    const nextRole = u.role === "ADMIN" ? "USER" : "ADMIN";
    const res = await apiFetch<AdminUserItem>(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role: nextRole }),
    });
    if (res.success) {
      showNotice(
        t(
          `Updated ${u.name}'s role to ${nextRole}`,
          `Peran ${u.name} berhasil diubah menjadi ${nextRole}`
        )
      );
      await fetchAdminData();
    } else {
      showNotice(
        res.error?.message ||
          t("Could not update user role.", "Gagal mengubah peran pengguna.")
      );
    }
  };

  const handleToggleUserBan = async (u: AdminUserItem) => {
    const nextBanned = !u.banned;
    const res = await apiFetch<AdminUserItem>(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ banned: nextBanned }),
    });
    if (res.success) {
      showNotice(
        nextBanned
          ? t(
              `Suspended account for ${u.email}`,
              `Akun ${u.email} telah ditangguhkan`
            )
          : t(
              `Reactivated account for ${u.email}`,
              `Akun ${u.email} telah diaktifkan kembali`
            )
      );
      await fetchAdminData();
    } else {
      showNotice(
        res.error?.message ||
          t("Could not update account status.", "Gagal mengubah status akun.")
      );
    }
  };

  const handleCreateSystemCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const res = await apiFetch<AdminCategoryItem>("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({
        name: catName.trim(),
        color: catColor,
        bgColor: catBgColor,
        icon: catIcon.trim() || "schedule",
        targetMinutesPerDay: Number(catTargetMins) || 60,
        description: catDescription.trim() || null,
      }),
    });

    if (res.success) {
      setCatName("");
      setCatDescription("");
      showNotice(
        t(
          `Created system category "${catName.trim()}"`,
          `Kategori sistem "${catName.trim()}" berhasil dibuat`
        )
      );
      await fetchAdminData();
    } else {
      showNotice(
        res.error?.message ||
          t("Failed to create category.", "Gagal membuat kategori.")
      );
    }
  };

  const handleDeleteCategory = async (cat: AdminCategoryItem) => {
    const res = await apiFetch(`/api/admin/categories/${cat.id}`, {
      method: "DELETE",
    });
    if (res.success) {
      showNotice(
        t(
          `Deleted category "${cat.name}"`,
          `Kategori "${cat.name}" telah dihapus`
        )
      );
      await fetchAdminData();
    } else {
      showNotice(
        res.error?.message ||
          t("Failed to delete category.", "Gagal menghapus kategori.")
      );
    }
  };

  const handleCreateTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipTitle.trim() || !tipContent.trim()) return;

    const res = await apiFetch<AdminTipItem>("/api/admin/tips", {
      method: "POST",
      body: JSON.stringify({
        title: tipTitle.trim(),
        category: tipCategory.trim() || "Circadian Reset",
        content: tipContent.trim(),
        actionLabel: tipActionLabel.trim() || null,
        icon: tipIcon.trim() || "lightbulb",
        isActive: true,
      }),
    });

    if (res.success) {
      setTipTitle("");
      setTipContent("");
      setTipActionLabel("");
      showNotice(
        t(
          `Published wellness tip "${tipTitle.trim()}"`,
          `Tips kesehatan "${tipTitle.trim()}" berhasil diterbitkan`
        )
      );
      await fetchAdminData();
    } else {
      showNotice(
        res.error?.message ||
          t("Failed to create wellness tip.", "Gagal menerbitkan tips kesehatan.")
      );
    }
  };

  const handleToggleTipActive = async (tip: AdminTipItem) => {
    const res = await apiFetch<AdminTipItem>(`/api/admin/tips/${tip.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !tip.isActive }),
    });
    if (res.success) {
      showNotice(
        t(
          `Tip "${tip.title}" is now ${!tip.isActive ? "Active" : "Hidden"}`,
          `Tips "${tip.title}" kini ${!tip.isActive ? "Aktif" : "Tersembunyi"}`
        )
      );
      await fetchAdminData();
    }
  };

  const handleDeleteTip = async (tip: AdminTipItem) => {
    const res = await apiFetch(`/api/admin/tips/${tip.id}`, {
      method: "DELETE",
    });
    if (res.success) {
      showNotice(
        t(`Deleted tip "${tip.title}"`, `Tips "${tip.title}" telah dihapus`)
      );
      await fetchAdminData();
    }
  };

  if (forbiddenError || (!loading && currentUserRole !== "ADMIN")) {
    return (
      <AppShell>
        <div className="my-12 max-w-xl mx-auto rounded-3xl bg-surface-container-lowest p-8 shadow-sm text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-error-container text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[30px]">
              gpp_maybe
            </span>
          </div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
            {t(
              "Administrator Access Required",
              "Memerlukan Akses Administrator"
            )}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {forbiddenError ||
              t(
                "Your account has the USER role. Only authorized ADMIN accounts can access platform user governance, system categories, and wellness tip curation.",
                "Akun Anda memiliki peran USER. Hanya akun ADMIN terotorisasi yang dapat mengakses pengelolaan pengguna, kategori sistem, dan kurasi tips kesehatan."
              )}
          </p>
          <Link
            href="/dashboard"
            className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold"
          >
            {t("Return to Personal Dashboard", "Kembali ke Dasbor Pribadi")}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell userRole="ADMIN">
      <div className="flex flex-col gap-8 w-full">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2 border-b border-surface-container-high/60 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm uppercase tracking-wider font-bold">
                {t("Platform Governance", "Tata Kelola Platform")}
              </span>
              <span className="font-label-sm text-label-sm text-secondary">
                •{" "}
                {t(
                  "Privacy-Preserving Admin Mode",
                  "Mode Admin Berorientasi Privasi"
                )}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight mt-1">
              {t("LifeSync Admin Console", "Konsol Admin LifeSync")}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-0.5">
              {t(
                "Manage platform accounts, global 24-hour activity categories, and evidence-based wellness tips without exposing private personal health records.",
                "Kelola akun platform, kategori aktivitas 24 jam global, dan tips kesehatan berbasis bukti tanpa mengekspos catatan kesehatan pribadi pengguna."
              )}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-container-lowest p-1.5 rounded-xl shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all ${
                activeTab === "users"
                  ? "bg-primary-container text-on-primary font-bold shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t("Users", "Pengguna")} ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("categories")}
              className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all ${
                activeTab === "categories"
                  ? "bg-primary-container text-on-primary font-bold shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t("Categories", "Kategori")} ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tips")}
              className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all ${
                activeTab === "tips"
                  ? "bg-primary-container text-on-primary font-bold shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t("Wellness Tips", "Tips Kesehatan")} ({tips.length})
            </button>
          </div>
        </div>

        {feedback && (
          <div className="rounded-2xl bg-secondary-container px-5 py-3 text-on-secondary-container font-label-md text-label-md flex items-center justify-between shadow-sm">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">
                verified
              </span>
              {feedback}
            </span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs text-secondary hover:underline"
            >
              {t("Dismiss", "Tutup")}
            </button>
          </div>
        )}

        {/* Platform Statistics Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
              {t("Registered Users", "Pengguna Terdaftar")}
            </span>
            <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-2">
              {stats?.totalRegisteredUsers ?? 0}
            </div>
            <span className="font-body-sm text-body-sm text-primary mt-1">
              {stats?.adminUsersCount ?? 0} {t("Admin(s)", "Admin")}
            </span>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
              {t("Active Users", "Pengguna Aktif")}
            </span>
            <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-2">
              {stats?.activeSessionUsers ?? 0}
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {t("Authenticated sessions", "Sesi terautentikasi")}
            </span>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
              {t("Activity Categories", "Kategori Aktivitas")}
            </span>
            <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-2">
              {stats?.totalCategoriesCount ?? 0}
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {t("System & custom pillars", "Pilar sistem & kustom")}
            </span>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
              {t("Scheduled Blocks", "Blok Terjadwal")}
            </span>
            <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-2">
              {stats?.totalScheduledBlocksCount ?? 0}
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {t("Aggregate platform count", "Total agregat platform")}
            </span>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
              {t("Wellness Tips", "Tips Kesehatan")}
            </span>
            <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-2">
              {stats?.totalWellnessTipsCount ?? 0}
            </div>
            <span className="font-body-sm text-body-sm text-primary mt-1">
              {t("Curated guidance", "Panduan terkurasi")}
            </span>
          </div>
        </div>

        {/* TAB 1: USER MANAGEMENT */}
        {activeTab === "users" && (
          <div className="bg-surface-container-lowest rounded-3xl p-7 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {t("Registered User Accounts", "Akun Pengguna Terdaftar")}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t(
                    "Promote or demote roles (`USER` / `ADMIN`) and manage account standing. Personal wellness records remain private.",
                    "Ubah peran (`USER` / `ADMIN`) dan kelola status akun. Catatan kesehatan pribadi tetap terlindungi."
                  )}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="border-b border-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase">
                    <th className="pb-3 font-semibold">
                      {t("User", "Pengguna")}
                    </th>
                    <th className="pb-3 font-semibold">{t("Role", "Peran")}</th>
                    <th className="pb-3 font-semibold">
                      {t("Status", "Status")}
                    </th>
                    <th className="pb-3 font-semibold">
                      {t("Joined", "Bergabung")}
                    </th>
                    <th className="pb-3 text-right font-semibold">
                      {t("Actions", "Tindakan")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low/60">
                  {users.map((u) => {
                    const isSelf = u.id === session?.user?.id;
                    return (
                      <tr key={u.id} className="hover:bg-surface/60">
                        <td className="py-4">
                          <div className="font-bold text-on-surface">
                            {u.name}{" "}
                            {isSelf && (
                              <span className="text-xs text-primary font-semibold">
                                ({t("You", "Anda")})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-on-surface-variant">
                            {u.email}
                          </div>
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${
                              u.role === "ADMIN"
                                ? "bg-primary-container text-on-primary"
                                : "bg-surface-container-low text-on-surface"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                              u.banned
                                ? "bg-error-container text-on-error-container"
                                : "bg-secondary-container text-on-secondary-container"
                            }`}
                          >
                            {u.banned
                              ? t("Suspended", "Ditangguhkan")
                              : t("Active", "Aktif")}
                          </span>
                        </td>
                        <td className="py-4 text-on-surface-variant">
                          {new Intl.DateTimeFormat(locale, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }).format(new Date(u.createdAt))}
                        </td>
                        <td className="py-4 text-right space-x-2">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleToggleUserRole(u)}
                            className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-secondary-container text-on-surface font-label-sm text-label-sm font-semibold disabled:opacity-40 transition-colors"
                          >
                            {t("Make", "Jadikan")}{" "}
                            {u.role === "ADMIN" ? "USER" : "ADMIN"}
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleToggleUserBan(u)}
                            className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold disabled:opacity-40 transition-colors ${
                              u.banned
                                ? "bg-secondary-container text-primary"
                                : "bg-error-container/70 text-on-error-container hover:bg-error-container"
                            }`}
                          >
                            {u.banned
                              ? t("Reactivate", "Aktifkan")
                              : t("Suspend", "Tangguhkan")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITY CATEGORIES MANAGEMENT */}
        {activeTab === "categories" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={handleCreateSystemCategory}
              className="lg:col-span-4 bg-surface-container-lowest rounded-3xl p-6 shadow-sm space-y-4"
            >
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {t("Add System Category", "Tambah Kategori Sistem")}
              </h3>
              <div>
                <label className="block font-label-md text-label-md font-semibold mb-1">
                  {t("Category Name", "Nama Kategori")}
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder={t("e.g., Creative Flow", "mis., Alur Kreatif")}
                  className="w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-md text-label-md font-semibold mb-1">
                    {t("Color", "Warna")}
                  </label>
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-full h-10 rounded-xl bg-surface-container-low p-1"
                  />
                </div>
                <div>
                  <label className="block font-label-md text-label-md font-semibold mb-1">
                    {t("Badge BG", "Warna Latar")}
                  </label>
                  <input
                    type="color"
                    value={catBgColor}
                    onChange={(e) => setCatBgColor(e.target.value)}
                    className="w-full h-10 rounded-xl bg-surface-container-low p-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-md text-label-md font-semibold mb-1">
                    {t("Material Icon", "Ikon Material")}
                  </label>
                  <input
                    type="text"
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    placeholder="spa"
                    className="w-full rounded-xl bg-surface-container-low px-3.5 py-2 font-body-sm text-body-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block font-label-md text-label-md font-semibold mb-1">
                    {t("Target (Mins/Day)", "Target (Mnt/Hari)")}
                  </label>
                  <input
                    type="number"
                    value={catTargetMins}
                    onChange={(e) =>
                      setCatTargetMins(Number(e.target.value) || 60)
                    }
                    className="w-full rounded-xl bg-surface-container-low px-3.5 py-2 font-body-sm text-body-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-md text-label-md font-semibold mb-1">
                  {t("Description", "Deskripsi")}
                </label>
                <textarea
                  rows={2}
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder={t(
                    "Optional pillar description...",
                    "Deskripsi pilar opsional..."
                  )}
                  className="w-full rounded-xl bg-surface-container-low px-3.5 py-2 font-body-sm text-body-sm outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-sm hover:bg-primary-container transition-all"
              >
                {t("Create System Category", "Buat Kategori Sistem")}
              </button>
            </form>

            <div className="lg:col-span-8 bg-surface-container-lowest rounded-3xl p-6 shadow-sm space-y-3">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-4">
                {t("Active Activity Categories", "Kategori Aktivitas Aktif")} (
                {categories.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-surface-container-low/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: c.color }}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {c.icon || "schedule"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-label-lg text-label-lg font-bold text-on-surface truncate">
                            {translateCategory(c.name)}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-lowest text-secondary font-semibold">
                            {c.isSystem
                              ? t("System", "Sistem")
                              : t("Custom", "Kustom")}
                          </span>
                        </div>
                        <div className="text-xs text-on-surface-variant">
                          {t("Target", "Target")}: {c.targetMinutesPerDay}{" "}
                          {t("mins/day", "mnt/hari")}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c)}
                      className="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
                      title={t("Delete Category", "Hapus Kategori")}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WELLNESS TIPS MANAGEMENT */}
        {activeTab === "tips" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={handleCreateTip}
              className="lg:col-span-4 bg-surface-container-lowest rounded-3xl p-6 shadow-sm space-y-4"
            >
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {t("Publish Wellness Tip", "Terbitkan Tips Kesehatan")}
              </h3>
              <div>
                <label className="block font-label-md text-label-md font-semibold mb-1">
                  {t("Title", "Judul")}
                </label>
                <input
                  type="text"
                  required
                  value={tipTitle}
                  onChange={(e) => setTipTitle(e.target.value)}
                  placeholder={t(
                    "e.g., Morning Photon Exposure",
                    "mis., Paparan Sinar Matahari Pagi"
                  )}
                  className="w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-md text-label-md font-semibold mb-1">
                    {t("Pillar Category", "Kategori Pilar")}
                  </label>
                  <input
                    type="text"
                    required
                    value={tipCategory}
                    onChange={(e) => setTipCategory(e.target.value)}
                    placeholder="Circadian Reset"
                    className="w-full rounded-xl bg-surface-container-low px-3.5 py-2 font-body-sm text-body-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block font-label-md text-label-md font-semibold mb-1">
                    {t("Material Icon", "Ikon Material")}
                  </label>
                  <input
                    type="text"
                    value={tipIcon}
                    onChange={(e) => setTipIcon(e.target.value)}
                    placeholder="wb_sunny"
                    className="w-full rounded-xl bg-surface-container-low px-3.5 py-2 font-body-sm text-body-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-md text-label-md font-semibold mb-1">
                  {t("Guidance Content", "Isi Panduan")}
                </label>
                <textarea
                  rows={3}
                  required
                  value={tipContent}
                  onChange={(e) => setTipContent(e.target.value)}
                  placeholder={t(
                    "Evidence-based circadian or lifestyle recommendation...",
                    "Rekomendasi sirkadian atau gaya hidup berbasis bukti..."
                  )}
                  className="w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-label-md text-label-md font-semibold mb-1">
                  {t("Action Callout Label (Optional)", "Label Aksi (Opsional)")}
                </label>
                <input
                  type="text"
                  value={tipActionLabel}
                  onChange={(e) => setTipActionLabel(e.target.value)}
                  placeholder={t(
                    "Recommended by 08:30 AM",
                    "Disarankan sebelum pukul 08:30"
                  )}
                  className="w-full rounded-xl bg-surface-container-low px-3.5 py-2 font-body-sm text-body-sm outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-sm hover:bg-primary-container transition-all"
              >
                {t("Publish Wellness Tip", "Terbitkan Tips Kesehatan")}
              </button>
            </form>

            <div className="lg:col-span-8 bg-surface-container-lowest rounded-3xl p-6 shadow-sm space-y-3">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-4">
                {t("Curated Wellness Tips", "Tips Kesehatan Terkurasi")} (
                {tips.length})
              </h3>
              <div className="space-y-3">
                {tips.map((tip) => (
                  <div
                    key={tip.id}
                    className="p-4 rounded-2xl bg-surface-container-low/60 flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary-container text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">
                          {tip.icon || "lightbulb"}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-label-lg text-label-lg font-bold text-on-surface">
                            {tip.title}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-lowest text-secondary font-semibold">
                            {tip.category}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              tip.isActive
                                ? "bg-secondary-container text-primary"
                                : "bg-surface-container-high text-outline"
                            }`}
                          >
                            {tip.isActive
                              ? t("Active", "Aktif")
                              : t("Hidden", "Disembunyikan")}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          {tip.content}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTipActive(tip)}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-on-surface font-label-sm text-label-sm font-semibold hover:bg-secondary-container transition-colors"
                      >
                        {tip.isActive
                          ? t("Hide", "Sembunyikan")
                          : t("Activate", "Aktifkan")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTip(tip)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
                        title={t("Delete Tip", "Hapus Tips")}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
