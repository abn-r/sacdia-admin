"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ClubSelect } from "@/components/shared/selectors/club-select";
import { EcclesiasticalYearSelect } from "@/components/shared/selectors/ecclesiastical-year-select";
import { Label } from "@/components/ui/label";

interface SectionProgressFiltersProps {
  yearId: number;
  clubId?: number;
}

/** Filters apply as they change and live in the URL; changing one goes back to page 1. */
export function SectionProgressFilters({ yearId, clubId }: SectionProgressFiltersProps) {
  const t = useTranslations("evaluation.progress.section.filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: number | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value === null) params.delete(key);
      else params.set(key, String(value));
      params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">{t("club")}</Label>
        <div className="w-full min-w-56 sm:w-64">
          <ClubSelect value={clubId ?? null} onChange={(id) => update("club_id", id)} placeholder={t("allClubs")} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">{t("year")}</Label>
        <div className="w-full min-w-44 sm:w-52">
          <EcclesiasticalYearSelect
            value={yearId}
            onChange={(id) => update("year_id", id)}
            placeholder={t("year")}
            activeOnly={false}
          />
        </div>
      </div>
    </div>
  );
}
