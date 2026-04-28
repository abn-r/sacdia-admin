import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

/**
 * Supported locales. `es` is the authoritative base; `pt-BR`, `en`, and `fr`
 * are target locales for the i18n Fase 1 pilot. Keep in lockstep with the
 * messages directory at the repo root.
 */
export const LOCALES = ["es", "pt-BR", "en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "sacdia_admin_locale";

function normalizeLocale(value: unknown): Locale {
  if (typeof value !== "string") return DEFAULT_LOCALE;
  return (LOCALES as readonly string[]).includes(value)
    ? (value as Locale)
    : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
