import type { Locale } from "@/i18n/runtime";

/**
 * Each locale's name in its own language, so people can find theirs whatever language the page is in.
 */
export const localeNames = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
  fr: "Français",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
} satisfies Record<Locale, string>;
