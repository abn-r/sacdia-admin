"use server";

import { cookies } from "next/headers";

import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/request";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Persists the UI locale. Invalid values are ignored (returns false). */
export async function setLocaleAction(locale: string): Promise<boolean> {
  if (!isLocale(locale)) return false;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
    httpOnly: false,
  });
  return true;
}
