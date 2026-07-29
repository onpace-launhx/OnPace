export const supportedLanguages = ["en", "tr", "es", "zh"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export type LocalizedCopy<T> = Record<SupportedLanguage, T>;

export function normalizeLanguage(language: string | null | undefined): SupportedLanguage {
  return supportedLanguages.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : "en";
}

export function localized<T>(
  language: string | null | undefined,
  copy: LocalizedCopy<T>
): T {
  return copy[normalizeLanguage(language)];
}

export function localeForLanguage(language: string | null | undefined) {
  return localized(language, {
    en: "en-US",
    tr: "tr-TR",
    es: "es-ES",
    zh: "zh-CN",
  });
}

export function languageName(language: string | null | undefined) {
  return localized(language, {
    en: "English",
    tr: "Turkish",
    es: "Spanish",
    zh: "Simplified Chinese",
  });
}
