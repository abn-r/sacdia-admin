import Link from "next/link";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getExpiringInsurance, INSURANCE_TYPE_LABELS } from "@/lib/api/insurance";
import type { ExpiringInsurance } from "@/lib/api/insurance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatName(item: ExpiringInsurance): string {
  if (item.user_name) return item.user_name;
  return [item.name, item.paternal_last_name, item.maternal_last_name]
    .filter(Boolean)
    .join(" ") || item.user_id;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function urgencyClass(days: number): string {
  if (days <= 7) return "text-destructive font-semibold";
  if (days <= 15) return "text-warning-foreground dark:text-warning font-medium";
  return "text-muted-foreground";
}

// ─── Component ────────────────────────────────────────────────────────────────

export async function ExpiringInsuranceAlert() {
  const t = await getTranslations("insurance");
  let items: ExpiringInsurance[] = [];

  try {
    items = await getExpiringInsurance(30);
  } catch {
    // Non-critical: silently omit the alert on fetch error
    return null;
  }

  if (items.length === 0) return null;

  const critical = items.filter((i) => i.days_remaining <= 7).length;

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-warning/20 px-4 py-3">
        <AlertTriangle className="size-4 shrink-0 text-warning-foreground dark:text-warning" />
        <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-warning-foreground dark:text-warning">
            {t("alert.title")}
          </span>
          <span className="text-xs text-warning-foreground/70 dark:text-warning/80">
            {t("alert.subtitle", { count: items.length })}
            {critical > 0 && (
              <span className="ml-1.5 font-semibold text-destructive">
                ({t("alert.critical_note", { count: critical })})
              </span>
            )}
          </span>
        </div>
        <Link
          href="/dashboard/insurance/expiring"
          className="flex items-center gap-1 text-xs font-medium text-warning-foreground hover:text-foreground dark:text-warning dark:hover:text-foreground shrink-0"
        >
          {t("alert.view_all")}
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* List */}
      <ul className="divide-y divide-warning/15">
        {items.map((item) => (
          <li
            key={item.insurance_id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
          >
            {/* Name */}
            <span className="min-w-40 font-medium text-foreground">
              {formatName(item)}
            </span>

            {/* Type */}
            {item.insurance_type && (
              <span className="text-xs text-muted-foreground">
                {INSURANCE_TYPE_LABELS[item.insurance_type] ?? item.insurance_type}
              </span>
            )}

            {/* Club / section */}
            {item.club && (
              <span className="text-xs text-muted-foreground">
                {item.club.name}
                {item.club_section ? ` · ${item.club_section.name}` : ""}
              </span>
            )}

            {/* Days remaining — pushed to the right */}
            <span className={`ml-auto flex items-center gap-1 text-xs tabular-nums ${urgencyClass(item.days_remaining)}`}>
              <Clock className="size-3 shrink-0" />
              {t("alert.expires_on", { date: formatDate(item.end_date), days: item.days_remaining })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
