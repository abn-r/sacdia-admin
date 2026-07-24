"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EcclesiasticalYearSelect } from "@/components/shared/selectors/ecclesiastical-year-select";
import { ClubSelect } from "@/components/shared/selectors/club-select";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionRankingsFiltersProps {
  defaultYear?: number;
  defaultClubId?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * GET-form filter bar for the section-rankings list page.
 *
 * Filters: year_id + club_id only.
 * section_id is intentionally omitted — sections ARE the rows, not a filter.
 *
 * Uses catalog-backed selectors for year and club.
 * Controlled state drives hidden inputs so the plain GET form
 * submission still encodes values as bookmarkable URL params.
 */
export function SectionRankingsFilters({
  defaultYear,
  defaultClubId,
}: SectionRankingsFiltersProps) {
  const t = useTranslations("rankings.sectionFilters");

  const [yearId, setYearId] = useState<number | null>(defaultYear ?? null);
  const [clubId, setClubId] = useState<number | null>(defaultClubId ?? null);

  return (
    <form
      className="rounded-xl border border-border/60 bg-muted/20 p-4"
      method="GET"
    >
      <div className="flex flex-wrap items-end gap-3">
      {/* Hidden inputs carry selected values as GET params on submit */}
      {yearId != null && (
        <input type="hidden" name="year_id" value={yearId} />
      )}
      {clubId != null && (
        <input type="hidden" name="club_id" value={clubId} />
      )}

      {/* Year filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">
          {t("labelYear")}
        </Label>
        <div className="w-52">
          <EcclesiasticalYearSelect
            value={yearId}
            onChange={setYearId}
            placeholder={t("placeholderYear")}
            activeOnly={false}
          />
        </div>
      </div>

      {/* Club filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">
          {t("labelClub")}
        </Label>
        <div className="w-56">
          <ClubSelect
            value={clubId}
            onChange={setClubId}
            placeholder={t("placeholderClub")}
          />
        </div>
      </div>

      {/* Actions — label spacer matches field columns for baseline alignment */}
      <div className="flex flex-col gap-1.5">
        <Label className="pointer-events-none text-xs text-muted-foreground opacity-0">
          {t("apply")}
        </Label>
        <div className="flex h-9 items-center gap-2">
          <Button type="submit" className="h-9">
            {t("apply")}
          </Button>
          <Button variant="outline" className="h-9" asChild>
            <Link href="/dashboard/section-rankings">{t("clear")}</Link>
          </Button>
        </div>
      </div>
      </div>
    </form>
  );
}
