import { localeForLanguage } from "@/lib/i18n";

export const countryOptions = [
  "TR", "US", "GB", "CA", "AU", "DE", "FR", "ES", "IT", "NL",
  "CN", "JP", "KR", "IN", "PK", "SG", "MY", "ID", "BR", "MX",
  "AR", "SA", "AE", "ZA", "NG", "EG", "PL", "SE", "NO", "DK",
  "FI", "CH", "AT", "BE", "PT", "GR", "IE", "NZ", "RO", "CZ",
] as const;

export type CountryCode = (typeof countryOptions)[number];

export function getCountryName(countryCode: string, language: string) {
  try {
    return new Intl.DisplayNames([localeForLanguage(language)], { type: "region" })
      .of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

