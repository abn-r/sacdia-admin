"use client";

import Link from "next/link";
import { ArrowLeft, Building2, Edit3, MapPin, MoreHorizontal, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getClubCode,
  getClubInitials,
  getClubLocations,
  getFoundedYear,
  getTotalMembers,
} from "./helpers";
import type { ClubFull, SectionView } from "./types";

interface HeroProps {
  club: ClubFull;
  sections: SectionView[];
  unitsCount: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ClubDetailHero({
  club,
  sections,
  unitsCount,
  onEdit,
  onDelete,
}: HeroProps) {
  const t = useTranslations("clubs.pages.detail.hero");

  const name = club.name ?? "Club";
  const initials = getClubInitials(name);
  const code = getClubCode(club);
  const foundedYear = getFoundedYear(club);
  const total = getTotalMembers(sections);
  const isActive = club.active !== false;
  const { localField, district, church } = getClubLocations(club);

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary via-primary/60 to-warning"
      />

      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[110px_1fr_auto] md:items-center">
        <div className="relative">
          <div
            aria-hidden
            className="grid h-[110px] w-[110px] place-items-center rounded-3xl bg-gradient-to-br from-primary to-primary/70 text-3xl font-extrabold tracking-wide text-primary-foreground shadow-lg shadow-primary/30"
          >
            {initials}
          </div>
          <span
            aria-hidden
            className={cn(
              "absolute -right-1.5 -top-1.5 size-7 rounded-full border-4 border-card",
              isActive ? "bg-success" : "bg-muted-foreground",
            )}
          />
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              {name}
            </h1>
            <span className="font-mono text-sm font-semibold text-muted-foreground">
              {code}
            </span>
          </div>
          {(club.description || foundedYear) && (
            <p className="text-sm text-muted-foreground">
              {club.description ?? t("noDescription")}
              {foundedYear && (
                <>
                  {" "}
                  · {t("foundedIn")} <span className="font-medium">{foundedYear}</span>
                </>
              )}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {church && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {church}
                {district && <> · {district}</>}
              </span>
            )}
            {localField && (
              <>
                {church && <span aria-hidden className="size-1 rounded-full bg-border" />}
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="size-3.5" /> {localField}
                </span>
              </>
            )}
            <span aria-hidden className="size-1 rounded-full bg-border" />
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" /> {t("members", { count: total })}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant={isActive ? "soft-success" : "outline"}>
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  isActive ? "bg-success" : "bg-muted-foreground",
                )}
              />
              {isActive ? t("statusActive") : t("statusInactive")}
            </Badge>
            {sections.map((s) => (
              <span
                key={s.kind + (s.sectionId ?? "")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  s.meta.pill,
                )}
              >
                {s.label} · {s.members}
              </span>
            ))}
            <Badge variant="outline">{t("units", { count: unitsCount })}</Badge>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row md:flex-col md:items-end">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/clubs">
                <ArrowLeft className="size-3.5" /> {t("backButton")}
              </Link>
            </Button>
            <Button variant="outline" size="icon-sm" aria-label={t("moreActions")}>
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            {onDelete && (
              <Button variant="destructive" size="sm" onClick={onDelete}>
                {t("deleteButton")}
              </Button>
            )}
            {onEdit && (
              <Button size="sm" onClick={onEdit}>
                <Edit3 className="size-3.5" /> {t("editButton")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
