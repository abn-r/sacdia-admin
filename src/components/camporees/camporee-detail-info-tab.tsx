import Link from "next/link";
import { CalendarRange, MapPin, DollarSign, Building2, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Camporee } from "@/lib/api/camporees";

type CamporeeDetailInfoTabProps = {
  camporee: Camporee;
  orgCard: {
    label: string;
    title: string;
    subtitle?: string | null;
  };
};

function formatRangeShort(
  start?: string | null,
  end?: string | null,
): { range: string; year: string } {
  if (!start || !end) return { range: "—", year: "" };
  try {
    const s = new Date(start);
    const e = new Date(end);
    const fmt = (d: Date) =>
      d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    const range = `${fmt(s)} – ${fmt(e)}`;
    const sy = s.getFullYear();
    const ey = e.getFullYear();
    const year = sy === ey ? String(sy) : `${sy}–${ey}`;
    return { range, year };
  } catch {
    return { range: "—", year: "" };
  }
}

function formatCurrencyMXN(value?: number | null): string {
  if (value == null) return "—";
  try {
    return value.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    });
  } catch {
    return String(value);
  }
}

function hasCoordinates(
  camporee: Camporee,
): camporee is Camporee & { lat: number; long: number } {
  return (
    typeof camporee.lat === "number" &&
    Number.isFinite(camporee.lat) &&
    typeof camporee.long === "number" &&
    Number.isFinite(camporee.long)
  );
}

export async function CamporeeDetailInfoTab({
  camporee,
  orgCard,
}: CamporeeDetailInfoTabProps) {
  const t = await getTranslations("camporees.pages.detail");
  const { range, year } = formatRangeShort(camporee.start_date, camporee.end_date);
  const campLocation = camporee.local_camporee_place?.trim();
  const coordinatesAvailable = hasCoordinates(camporee);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Card className="rounded-xl border-border/60 bg-card px-4 py-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarRange className="size-3.5" />
            {t("labelDatesKpi")}
          </div>
          <div className="mt-1 text-[18px] font-bold tabular-nums tracking-tight">{range}</div>
          {year && <div className="mt-0.5 text-[11.5px] text-muted-foreground">{year}</div>}
        </Card>

        <Card className="rounded-xl border-border/60 bg-card px-4 py-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="size-3.5" />
            {t("labelCampLocationKpi")}
          </div>
          <div className="mt-1 text-[15px] font-semibold tracking-tight">{campLocation || "—"}</div>
          {coordinatesAvailable && (
            <div className="mt-0.5 text-[11.5px] text-muted-foreground tabular-nums">
              {camporee.lat}, {camporee.long}
            </div>
          )}
        </Card>

        <Card className="rounded-xl border-border/60 bg-card px-4 py-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            <DollarSign className="size-3.5" />
            {t("labelCost")}
          </div>
          <div className="mt-1 text-[18px] font-bold tabular-nums tracking-tight">
            {formatCurrencyMXN(camporee.registration_cost)}
          </div>
          {camporee.registration_cost != null && (
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">{t("costPerMember")}</div>
          )}
        </Card>

        <Card className="rounded-xl border-border/60 bg-card px-4 py-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 className="size-3.5" />
            {orgCard.label}
          </div>
          <div className="mt-1 truncate text-[15px] font-semibold tracking-tight">
            {orgCard.title || "—"}
          </div>
          {orgCard.subtitle && (
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">{orgCard.subtitle}</div>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden rounded-xl border-border/60 bg-card shadow-xs">
        <div className="border-b border-border/60 bg-muted/30 px-5 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("cardTitle")}
          </div>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("labelCampLocation")}
            </div>
            {campLocation ? (
              <div className="space-y-1">
                <p className="text-[13px] leading-relaxed text-foreground">{campLocation}</p>
                {coordinatesAvailable && (
                  <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                    <span className="tabular-nums">
                      {t("coordinates", { lat: camporee.lat, lng: camporee.long })}
                    </span>
                    <Link
                      href={`https://www.google.com/maps?q=${camporee.lat},${camporee.long}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {t("openInMaps")}
                      <ExternalLink className="size-3" aria-hidden />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-[12px] text-muted-foreground">—</span>
            )}
          </div>

          <div>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("labelIncludes")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {camporee.includes_adventurers && (
                <Badge variant="secondary">Aventureros</Badge>
              )}
              {camporee.includes_pathfinders && (
                <Badge variant="secondary">Conquistadores</Badge>
              )}
              {camporee.includes_master_guides && (
                <Badge variant="secondary">Guías Mayores</Badge>
              )}
              {!camporee.includes_adventurers &&
                !camporee.includes_pathfinders &&
                !camporee.includes_master_guides && (
                  <span className="text-[12px] text-muted-foreground">—</span>
                )}
            </div>
          </div>

          {camporee.description && (
            <div>
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("labelDescription")}
              </div>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-foreground">
                {camporee.description}
              </p>
            </div>
          )}

          <div className="border-t border-border/60 pt-2">
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {t("internalId", { id: camporee.camporee_id ?? camporee.id ?? "—" })}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
