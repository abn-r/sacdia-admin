"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberRankingsFiltersProps {
  defaultYear?: number;
  defaultClubId?: number;
  defaultSectionId?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * GET-form filter bar for the member-rankings list page.
 *
 * Uses plain number inputs for year, club, and section.
 * TODO: Replace with catalog-backed <Select> components once
 *       catalog hooks / fetch helpers are available for each entity.
 *
 * Submitting the form encodes values as query params (bookmarkable URLs).
 * The reset link navigates to the bare route, clearing all params.
 */
export function MemberRankingsFilters({
  defaultYear,
  defaultClubId,
  defaultSectionId,
}: MemberRankingsFiltersProps) {
  const t = useTranslations("rankings.filters");

  return (
    <form className="flex flex-wrap items-end gap-3" method="GET">
      {/* Year filter */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-year" className="text-xs text-muted-foreground">
          {t("labelYear")}
        </Label>
        <Input
          id="filter-year"
          name="year_id"
          type="number"
          min={2000}
          max={2100}
          placeholder={t("placeholderYear")}
          defaultValue={defaultYear}
          className="h-9 w-32"
        />
      </div>

      {/* Club filter */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="filter-club"
          className="text-xs text-muted-foreground"
        >
          {t("labelClub")}
        </Label>
        <Input
          id="filter-club"
          name="club_id"
          type="number"
          min={1}
          placeholder={t("placeholderClub")}
          defaultValue={defaultClubId}
          className="h-9 w-32"
        />
      </div>

      {/* Section filter */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="filter-section"
          className="text-xs text-muted-foreground"
        >
          {t("labelSection")}
        </Label>
        <Input
          id="filter-section"
          name="section_id"
          type="number"
          min={1}
          placeholder={t("placeholderSection")}
          defaultValue={defaultSectionId}
          className="h-9 w-32"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          {t("apply")}
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/member-rankings">{t("clear")}</Link>
        </Button>
      </div>
    </form>
  );
}
