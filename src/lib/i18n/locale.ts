export const ADMIN_LOCALE_COOKIE = "sacdia_admin_locale";

export type AdminLocale = "es-MX" | "es-ES" | "en-US";

export function normalizeAdminLocale(value: unknown): AdminLocale {
  if (value === "es-ES" || value === "en-US") {
    return value;
  }

  return "es-MX";
}

export function toHtmlLang(locale: AdminLocale): "es" | "en" {
  return locale === "en-US" ? "en" : "es";
}
