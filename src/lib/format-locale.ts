import { useLocale } from "next-intl";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/request";

const LOCALE_TO_BCP47: Record<Locale, string> = {
  es: "es-MX",
  en: "en-US",
  fr: "fr-FR",
  "pt-BR": "pt-BR",
};

export function localeToBcp47(locale: Locale | string): string {
  return LOCALE_TO_BCP47[locale as Locale] ?? "es-MX";
}

export function formatDate(
  value: Date | string | number,
  locale: Locale | string,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(localeToBcp47(locale), options).format(date);
}

export function formatDateTime(
  value: Date | string | number,
  locale: Locale | string,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  return formatDate(value, locale, options);
}

export function formatNumber(
  value: number,
  locale: Locale | string,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(localeToBcp47(locale), options).format(value);
}

export function formatCurrency(
  amount: number,
  locale: Locale | string,
  currency: string = "MXN",
): string {
  return new Intl.NumberFormat(localeToBcp47(locale), {
    style: "currency",
    currency,
  }).format(amount);
}

export function useFormatDate() {
  const locale = useLocale();
  return (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
    formatDate(value, locale, options);
}

export function useFormatDateTime() {
  const locale = useLocale();
  return (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
    formatDateTime(value, locale, options);
}

export function useFormatNumber() {
  const locale = useLocale();
  return (value: number, options?: Intl.NumberFormatOptions) =>
    formatNumber(value, locale, options);
}

export function useFormatCurrency() {
  const locale = useLocale();
  return (amount: number, currency: string = "MXN") =>
    formatCurrency(amount, locale, currency);
}

export async function getFormatDate() {
  const locale = await getLocale();
  return (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
    formatDate(value, locale, options);
}

export async function getFormatDateTime() {
  const locale = await getLocale();
  return (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
    formatDateTime(value, locale, options);
}

export async function getFormatNumber() {
  const locale = await getLocale();
  return (value: number, options?: Intl.NumberFormatOptions) =>
    formatNumber(value, locale, options);
}

export async function getFormatCurrency() {
  const locale = await getLocale();
  return (amount: number, currency: string = "MXN") =>
    formatCurrency(amount, locale, currency);
}
