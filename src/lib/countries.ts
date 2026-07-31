import { localeForLanguage } from "@/lib/i18n";

const nonCountryRegionCodes = new Set([
  "AC", "CP", "DG", "EA", "EU", "EZ", "IC", "TA", "UN", "XA", "XB",
]);

function buildCountryOptions() {
  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  const codes: string[] = [];
  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first, second);
      const name = displayNames.of(code);
      if (name && name !== code && !nonCountryRegionCodes.has(code)) codes.push(code);
    }
  }
  return codes;
}

export const countryOptions = buildCountryOptions();

export type CountryCode = string;

export function getCountryName(countryCode: string, language: string) {
  try {
    return new Intl.DisplayNames([localeForLanguage(language)], { type: "region" })
      .of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}
