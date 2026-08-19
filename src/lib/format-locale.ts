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

/** Default display zone for timestamps. Matches camporee IANA default. */
export const SACDIA_DISPLAY_TIMEZONE = "America/Mexico_City";

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

const MONTHS_SHORT: Record<Locale, readonly string[]> = {
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  fr: ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"],
  "pt-BR": ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
};

const MONTHS_LONG: Record<Locale, readonly string[]> = {
  es: [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  fr: [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ],
  "pt-BR": [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ],
};

export type CalendarDateStyle = "short" | "long" | "numeric";

function resolveLocale(locale: Locale | string): Locale {
  if (locale in MONTHS_SHORT) return locale as Locale;
  if (locale.startsWith("pt")) return "pt-BR";
  if (locale.startsWith("es")) return "es";
  if (locale.startsWith("en")) return "en";
  if (locale.startsWith("fr")) return "fr";
  return "es";
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseIsoDateParts(
  value: string | Date | number | null | undefined,
): { year: number; month: number; day: number } | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const match = ISO_DATE_PREFIX.exec(value.trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    return { year, month, day };
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/**
 * Calendar dates (`YYYY-MM-DD` or ISO starting with that prefix).
 * Does not use Intl month names or the host timezone — SSR and browser stay in sync,
 * and `2026-08-21` stays 21 August even in America/Mexico_City.
 */
export function formatCalendarDate(
  value: string | Date | number | null | undefined,
  locale: Locale | string = "es",
  style: CalendarDateStyle = "short",
): string {
  const parts = parseIsoDateParts(value);
  if (!parts) return "—";
  const resolved = resolveLocale(locale);
  if (style === "numeric") {
    return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`;
  }
  const months = style === "long" ? MONTHS_LONG[resolved] : MONTHS_SHORT[resolved];
  const monthLabel = months[parts.month - 1] ?? pad2(parts.month);
  if (style === "long") {
    if (resolved === "en") return `${monthLabel} ${parts.day}, ${parts.year}`;
    return `${parts.day} de ${monthLabel} de ${parts.year}`;
  }
  return `${parts.day} ${monthLabel} ${parts.year}`;
}

export function formatCalendarDateRange(
  start?: string | null,
  end?: string | null,
  locale: Locale | string = "es",
): { range: string; year: string } {
  const startParts = parseIsoDateParts(start);
  const endParts = parseIsoDateParts(end);
  if (!startParts || !endParts) return { range: "—", year: "" };
  const resolved = resolveLocale(locale);
  const months = MONTHS_SHORT[resolved];
  const startLabel = `${startParts.day} ${months[startParts.month - 1]}`;
  const endLabel = `${endParts.day} ${months[endParts.month - 1]}`;
  const year =
    startParts.year === endParts.year
      ? String(startParts.year)
      : `${startParts.year}–${endParts.year}`;
  return { range: `${startLabel} – ${endLabel}`, year };
}

/**
 * Timestamps in a fixed IANA zone, assembled from formatToParts so ICU
 * literals (NBSP, commas, month abbreviations) cannot diverge SSR vs client.
 */
export function formatTimestamp(
  value: string | Date | number | null | undefined,
  timeZone: string = SACDIA_DISPLAY_TIMEZONE,
): string {
  if (value == null || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

/**
 * Tabular numbers with ASCII decimal point and no grouping.
 * Avoids Node vs Chromium ICU mismatches (NNBSP vs space, comma vs period).
 */
export function formatTabularNumber(value: number, maxFractionDigits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
    useGrouping: false,
  }).format(value);
}

export function formatMxnAmount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
  return `$${amount}`;
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
