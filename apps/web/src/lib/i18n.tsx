"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Globe } from "lucide-react";

export type Language = "en" | "id";

interface LanguageContextValue {
  lang: Language;
  locale: string;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (enText: string, idText: string) => string;
  translateCategory: (name: string) => string;
  translateMood: (mood: string) => string;
}

const STORAGE_KEY = "lifesync_lang";

const CATEGORY_ID_MAP: Record<string, string> = {
  Sleep: "Tidur",
  Work: "Kerja",
  Study: "Belajar",
  Exercise: "Olahraga",
  Meals: "Makan & Nutrisi",
  Commute: "Perjalanan",
  Entertainment: "Hiburan",
  "Personal Time": "Waktu Pribadi",
  Rest: "Istirahat",
  Other: "Lainnya",
  Movement: "Olahraga",
  Nutrition: "Nutrisi",
  Personal: "Pribadi",
};

const MOOD_ID_MAP: Record<string, string> = {
  Peaceful: "Damai",
  Motivated: "Termotivasi",
  Calm: "Tenang",
  Focused: "Fokus",
  Vibrant: "Berenergi",
  Steady: "Stabil",
  Fatigued: "Lelah",
  Restless: "Gelisah",
  "Calm & Focused": "Tenang & Fokus",
  Recharging: "Pemulihan",
  Peak: "Puncak",
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "id" || saved === "en") {
        setLangState(saved);
        document.documentElement.lang = saved;
      }
    } catch {
      // Ignore storage access issues
    }
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    } catch {
      // Ignore storage access issues
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "en" ? "id" : "en");
  }, [lang, setLang]);

  const t = useCallback(
    (enText: string, idText: string): string => {
      return lang === "id" ? idText : enText;
    },
    [lang]
  );

  const translateCategory = useCallback(
    (name: string): string => {
      if (lang !== "id") return name;
      return CATEGORY_ID_MAP[name] ?? name;
    },
    [lang]
  );

  const translateMood = useCallback(
    (mood: string): string => {
      if (lang !== "id") return mood;
      return MOOD_ID_MAP[mood] ?? mood;
    },
    [lang]
  );

  const locale = lang === "id" ? "id-ID" : "en-US";

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      locale,
      setLang,
      toggleLang,
      t,
      translateCategory,
      translateMood,
    }),
    [lang, locale, setLang, toggleLang, t, translateCategory, translateMood]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl bg-surface-container-low p-1 border border-outline-variant/20 ${className}`}
      title={t("Switch Language (English / Bahasa Indonesia)", "Ganti Bahasa (Inggris / Bahasa Indonesia)")}
    >
      <Globe className="h-3.5 w-3.5 text-secondary ml-1.5 mr-0.5 shrink-0" />
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-2 py-1 rounded-lg font-label-sm text-label-sm font-bold transition-all ${
          lang === "en"
            ? "bg-primary-container text-on-primary shadow-xs"
            : "text-on-surface-variant hover:text-on-surface"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("id")}
        className={`px-2 py-1 rounded-lg font-label-sm text-label-sm font-bold transition-all ${
          lang === "id"
            ? "bg-primary-container text-on-primary shadow-xs"
            : "text-on-surface-variant hover:text-on-surface"
        }`}
      >
        ID
      </button>
    </div>
  );
}

