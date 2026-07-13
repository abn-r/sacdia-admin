"use client";

import { PanelDashboardLink } from "@/components/shared/panel-dashboard-link";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EcclesiasticalYearSelect } from "@/components/shared/selectors/ecclesiastical-year-select";
import { ClubSelect } from "@/components/shared/selectors/club-select";
import { ClubSectionSelect } from "@/components/shared/selectors/club-section-select";

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
 * Uses catalog-backed selectors for year, club, and section.
 * Controlled state drives hidden inputs so the plain GET form
 * submission still encodes values as bookmarkable URL params.
 *
 * When club_id changes, section_id resets to null — both internally
 * in ClubSectionSelect and in the parent state via its onChange callback.
 */
export function MemberRankingsFilters({
  defaultYear,
  defaultClubId,
  defaultSectionId,
}: MemberRankingsFiltersProps) {
  const t = useTranslations("rankings.filters");

  const [yearId, setYearId] = useState<number | null>(defaultYear ?? null);
  const [clubId, setClubId] = useState<number | null>(defaultClubId ?? null);
  const [sectionId, setSectionId] = useState<number | null>(
    defaultSectionId ?? null,
  );

  function handleClubChange(id: number | null) {
    setClubId(id);
    // Reset section whenever the club changes.
    // ClubSectionSelect also fires its own onChange(null) via its internal
    // useEffect — that call is idempotent here.
    setSectionId(null);
  }

  return (
    <form className="flex flex-wrap items-end gap-3" method="GET">
      {/* Hidden inputs carry selected values as GET params on submit */}
      {yearId != null && (
        <input type="hidden" name="year_id" value={yearId} />
      )}
      {clubId != null && (
        <input type="hidden" name="club_id" value={clubId} />
      )}
      {sectionId != null && (
        <input type="hidden" name="section_id" value={sectionId} />
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
            onChange={handleClubChange}
            placeholder={t("placeholderClub")}
          />
        </div>
      </div>

      {/* Section filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">
          {t("labelSection")}
        </Label>
        <div className="w-56">
          <ClubSectionSelect
            clubId={clubId}
            value={sectionId}
            onChange={setSectionId}
            placeholder={t("placeholderSection")}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          {t("apply")}
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <PanelDashboardLink href="/dashboard/member-rankings">{t("clear")}</PanelDashboardLink>
        </Button>
      </div>
    </form>
  );
}
