"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, ChevronRight } from "lucide-react";
import { ScopePicker } from "@/components/shared/scope-picker";
import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/shared/data-table-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildClubScopeOptions,
  decodeScopeId,
  encodeScopeId,
} from "@/lib/club-context/scope";
import { rememberClubContext, useClubContext } from "@/lib/club-context/use-club-context";
import type { ClubContextClub } from "@/lib/club-context/types";
import { getFinanceSectionLabel } from "@/lib/finances/club-sections";
import { cn } from "@/lib/utils";

export interface ClubContextBarProps {
  clubs: ClubContextClub[];
  /** Resolved on the server from `?club=` / the remembered cookie. */
  clubId: number | null;
  sectionId: number | null;
  /** Club roles: they have one club, so there is nothing to pick. */
  fixed?: boolean;
  /** Finanzas can show a whole club; Inventario and Seguros need one section. */
  allowAllSections?: boolean;
  /** Label of the "no club" state (territory roles). */
  allLabel?: string;
  /** Replaces the default hint next to the pill. */
  hint?: ReactNode;
  className?: string;
}

/**
 * One pill above the page title: which club and section you are in. Opens a
 * club + section search. The choice lives in the URL and is remembered across
 * Finanzas, Inventario and Seguros.
 */
export function ClubContextBar({
  clubs,
  clubId,
  sectionId,
  fixed = false,
  allowAllSections = false,
  allLabel,
  hint,
  className,
}: ClubContextBarProps) {
  const t = useTranslations("ops.club.context");
  const { select } = useClubContext();

  const club = clubs.find((c) => c.club_id === clubId) ?? null;
  const section = club?.sections.find((s) => s.club_section_id === sectionId) ?? null;
  const sectionText = section
    ? getFinanceSectionLabel(section)
    : club && club.sections.length > 1 && allowAllSections
      ? t("allSections")
      : club?.sections.length === 1 && club.sections[0]
        ? getFinanceSectionLabel(club.sections[0])
        : undefined;

  const options = buildClubScopeOptions(clubs, {
    allowAllSections,
    allSectionsLabel: t("allSections"),
  });

  const defaultHint = club
    ? (club.group ?? null)
    : fixed
      ? null
      : t("hintPick");

  return (
    <div
      data-slot="club-context-bar"
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}
    >
      {fixed && club ? (
        <span
          className="inline-flex h-8 max-w-full items-center gap-2 rounded-full border bg-background px-3 text-sm"
          aria-label={t("current", { club: club.name })}
        >
          <Building2 className="size-4 shrink-0" aria-hidden />
          <span className="truncate font-semibold">{club.name}</span>
          {sectionText ? <span className="truncate text-muted-foreground">{sectionText}</span> : null}
        </span>
      ) : (
        <ScopePicker
          value={
            club
              ? {
                  id: encodeScopeId(club.club_id, section?.club_section_id),
                  name: club.name,
                  level: sectionText,
                }
              : undefined
          }
          options={options}
          allLabel={allLabel ?? t("noClub")}
          onChange={(id) => {
            const decoded = id ? decodeScopeId(id) : null;
            if (!decoded) {
              select(null, null);
              return;
            }
            const picked = clubs.find((c) => c.club_id === decoded.clubId);
            // A club with a single section always travels with it.
            const nextSection =
              decoded.sectionId ??
              (picked && picked.sections.length === 1 ? (picked.sections[0]?.club_section_id ?? null) : null);
            select(decoded.clubId, nextSection);
          }}
        />
      )}
      {(hint ?? defaultHint) ? (
        <span className="text-sm text-muted-foreground">{hint ?? defaultHint}</span>
      ) : null}
    </div>
  );
}

/**
 * What a territory role sees before choosing a club in Inventario or Seguros:
 * the clubs of their territory, each one a way in. Never an empty page.
 */
/** The sections of a chosen club as direct links, so a club with several sections is never a dead end. */
export function SectionPickLinks({ club }: { club: ClubContextClub }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {club.sections.map((section) => {
        const qs = new URLSearchParams({
          club: String(club.club_id),
          section: String(section.club_section_id),
        });
        return (
          <Button key={section.club_section_id} asChild variant="outline" size="sm">
            <Link
              href={`${pathname}?${qs.toString()}`}
              onClick={() => rememberClubContext(club.club_id, section.club_section_id)}
            >
              {getFinanceSectionLabel(section)}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

export function ClubPickList({ clubs }: { clubs: ClubContextClub[] }) {
  const t = useTranslations("ops.club.context");
  const pathname = usePathname();

  function hrefFor(club: ClubContextClub): { href: string; sectionId: number | null } {
    const only = club.sections.length === 1 ? (club.sections[0]?.club_section_id ?? null) : null;
    const qs = new URLSearchParams({ club: String(club.club_id) });
    if (only) qs.set("section", String(only));
    return { href: `${pathname}?${qs.toString()}`, sectionId: only };
  }

  const sectionsText = (club: ClubContextClub) =>
    club.sections.length === 0
      ? t("noSections")
      : club.sections.map((s) => getFinanceSectionLabel(s)).join(" · ");

  return (
    <>
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("colClub")}</TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("colGroup")}</TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("colSections")}</TableHead>
              <TableHead className="h-9 w-10 px-3">
                <span className="sr-only">{t("colOpen")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clubs.map((club) => {
              const { href, sectionId } = hrefFor(club);
              return (
                <TableRow key={club.club_id} className="hover:bg-muted/30">
                  <TableCell className="px-3 py-2.5 align-middle">
                    <Link
                      href={href}
                      onClick={() => rememberClubContext(club.club_id, sectionId)}
                      className="rounded-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {club.name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {club.group ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {sectionsText(club)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-muted-foreground">
                    <ChevronRight className="size-4" aria-hidden />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      <DataTableShell className="md:hidden">
        <ul aria-label={t("listLabel")} className="divide-y">
          {clubs.map((club) => {
            const { href, sectionId } = hrefFor(club);
            return (
              <li key={club.club_id}>
                <Link
                  href={href}
                  onClick={() => rememberClubContext(club.club_id, sectionId)}
                  className="flex items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{club.name}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {[club.group, sectionsText(club)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </DataTableShell>
    </>
  );
}
