"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { enrollClub, enrollClubToUnionCamporee } from "@/lib/api/camporees";
import { listClubs, getClubSections, type Club } from "@/lib/api/clubs";

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface EnrollClubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporeeId: number;
  isUnionCamporee?: boolean;
  /** Local field of the camporee — used to scope the club list. */
  localFieldId?: number | null;
  /** Section eligibility flags inherited from the camporee. */
  includesAdventurers?: boolean;
  includesPathfinders?: boolean;
  includesMasterGuides?: boolean;
  onSuccess: () => void;
}

// ─── Section kind helpers ─────────────────────────────────────────────────────

type SectionKind = "adventurers" | "pathfinders" | "master_guides" | "unknown";

type RawClubSection = {
  club_section_id: number;
  active?: boolean;
  name?: string | null;
  club_type_id?: number;
  club_types?: { club_type_id?: number; name?: string | null } | null;
  club_type?: { club_type_id?: number; name?: string | null; slug?: string | null } | null;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Classifies a club section as one of the three camporee-eligible kinds.
 *
 * Strategy:
 * 1. Prefer the numeric `club_type_id` because it is stable across i18n.
 *    Convention used across SACDIA: 1=Aventureros, 2=Conquistadores, 3=Guías Mayores.
 * 2. Fall back to name/slug heuristics (handles edge cases where seed IDs
 *    differ between environments).
 */
function detectSectionKind(section: RawClubSection): SectionKind {
  const id =
    section.club_type_id ??
    section.club_types?.club_type_id ??
    section.club_type?.club_type_id;

  if (id === 1) return "adventurers";
  if (id === 2) return "pathfinders";
  if (id === 3) return "master_guides";

  const candidates: string[] = [];
  if (section.club_types?.name) candidates.push(section.club_types.name);
  if (section.club_type?.name) candidates.push(section.club_type.name);
  if (section.club_type?.slug) candidates.push(section.club_type.slug);

  for (const raw of candidates) {
    const slug = normalize(raw);
    if (slug.includes("aventur") || slug.includes("adventur"))
      return "adventurers";
    if (slug.includes("conquist") || slug.includes("pathfind"))
      return "pathfinders";
    if (
      slug.includes("guia") ||
      slug.includes("master") ||
      slug.includes("guild")
    )
      return "master_guides";
  }
  return "unknown";
}

const SECTION_LABEL: Record<SectionKind, string> = {
  adventurers: "Aventureros",
  pathfinders: "Conquistadores",
  master_guides: "Guías Mayores",
  unknown: "Sección",
};

// ─── Response parsers ─────────────────────────────────────────────────────────

function parseClubList(payload: unknown): Club[] {
  if (Array.isArray(payload)) return payload as Club[];
  if (payload && typeof payload === "object") {
    const r = payload as { data?: unknown };
    if (Array.isArray(r.data)) return r.data as Club[];
  }
  return [];
}

function parseSectionList(payload: unknown): RawClubSection[] {
  if (Array.isArray(payload)) return payload as RawClubSection[];
  if (payload && typeof payload === "object") {
    const r = payload as { data?: unknown };
    if (Array.isArray(r.data)) return r.data as RawClubSection[];
  }
  return [];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EnrollClubDialog({
  open,
  onOpenChange,
  camporeeId,
  isUnionCamporee = false,
  localFieldId,
  includesAdventurers = false,
  includesPathfinders = false,
  includesMasterGuides = false,
  onSuccess,
}: EnrollClubDialogProps) {
  const t = useTranslations("camporees");

  // ── State ──
  const [clubId, setClubId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");

  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);
  const [clubsError, setClubsError] = useState<string | null>(null);

  const [sections, setSections] = useState<RawClubSection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [sectionsError, setSectionsError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Eligible kinds derived from camporee flags ──
  const eligibleKinds = useMemo<ReadonlySet<SectionKind>>(() => {
    const set = new Set<SectionKind>();
    if (includesAdventurers) set.add("adventurers");
    if (includesPathfinders) set.add("pathfinders");
    if (includesMasterGuides) set.add("master_guides");
    return set;
  }, [includesAdventurers, includesPathfinders, includesMasterGuides]);

  // ── Reset on open / close ──
  useEffect(() => {
    if (!open) {
      setClubId("");
      setSectionId("");
      setSections([]);
      setSectionsError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingClubs(true);
    setClubsError(null);
    setClubs([]);

    (async () => {
      try {
        const payload = await listClubs({
          localFieldId: isUnionCamporee ? undefined : (localFieldId ?? undefined),
          active: true,
          page: 1,
          limit: 200,
        });
        if (cancelled) return;
        setClubs(parseClubList(payload));
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : t("enrollDialog.errorClubs");
        setClubsError(message);
      } finally {
        if (!cancelled) setIsLoadingClubs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isUnionCamporee, localFieldId, t]);

  // ── Load sections when a club is picked ──
  useEffect(() => {
    if (!open || !clubId) {
      setSections([]);
      setSectionId("");
      setSectionsError(null);
      return;
    }

    const numericClubId = Number(clubId);
    if (!Number.isFinite(numericClubId)) return;

    let cancelled = false;
    setIsLoadingSections(true);
    setSectionsError(null);
    setSections([]);
    setSectionId("");

    (async () => {
      try {
        const payload = await getClubSections(numericClubId);
        if (cancelled) return;
        setSections(parseSectionList(payload));
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : t("enrollDialog.errorSections");
        setSectionsError(message);
      } finally {
        if (!cancelled) setIsLoadingSections(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, clubId, t]);

  // ── Filter sections by camporee eligibility + active flag ──
  const eligibleSections = useMemo(() => {
    return sections
      .filter((s) => s.active !== false)
      .map((s) => ({ raw: s, kind: detectSectionKind(s) }))
      .filter((entry) => eligibleKinds.has(entry.kind));
  }, [sections, eligibleKinds]);

  // ── Submit ──
  const canSubmit =
    !!clubId &&
    !!sectionId &&
    !isSubmitting &&
    !isLoadingClubs &&
    !isLoadingSections;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const numericSectionId = Number(sectionId);
    if (!Number.isFinite(numericSectionId) || numericSectionId <= 0) return;

    setIsSubmitting(true);
    try {
      if (isUnionCamporee) {
        await enrollClubToUnionCamporee(camporeeId, {
          club_section_id: numericSectionId,
        });
      } else {
        await enrollClub(camporeeId, { club_section_id: numericSectionId });
      }
      toast.success(t("toasts.club_enrolled"));
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.enroll_club");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("enrollDialog.title")}</DialogTitle>
          <DialogDescription>{t("enrollDialog.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* ── Club select ── */}
          <div className="space-y-2">
            <Label htmlFor="enroll-club-select">
              {t("enrollDialog.labelClub")}{" "}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </Label>
            <Select
              value={clubId}
              onValueChange={setClubId}
              disabled={isLoadingClubs || isSubmitting || clubs.length === 0}
            >
              <SelectTrigger id="enroll-club-select" aria-required="true">
                <SelectValue
                  placeholder={
                    isLoadingClubs
                      ? t("enrollDialog.loadingClubs")
                      : t("enrollDialog.placeholderClub")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {clubs.map((c) => (
                  <SelectItem key={c.club_id} value={String(c.club_id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoadingClubs && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                {t("enrollDialog.loadingClubs")}
              </p>
            )}
            {!isLoadingClubs && clubsError && (
              <p className="text-xs text-destructive">{clubsError}</p>
            )}
            {!isLoadingClubs && !clubsError && clubs.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("enrollDialog.emptyClubs")}
              </p>
            )}
          </div>

          {/* ── Section select ── */}
          <div className="space-y-2">
            <Label htmlFor="enroll-section-select">
              {t("enrollDialog.labelSection")}{" "}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </Label>
            <Select
              value={sectionId}
              onValueChange={setSectionId}
              disabled={
                !clubId ||
                isLoadingSections ||
                isSubmitting ||
                eligibleSections.length === 0
              }
            >
              <SelectTrigger id="enroll-section-select" aria-required="true">
                <SelectValue
                  placeholder={
                    !clubId
                      ? t("enrollDialog.placeholderSectionPickClub")
                      : isLoadingSections
                        ? t("enrollDialog.loadingSections")
                        : t("enrollDialog.placeholderSection")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {eligibleSections.map(({ raw, kind }) => {
                  const label = SECTION_LABEL[kind];
                  const detail = raw.name && raw.name !== label ? ` · ${raw.name}` : "";
                  return (
                    <SelectItem
                      key={raw.club_section_id}
                      value={String(raw.club_section_id)}
                    >
                      {label}
                      {detail}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {isLoadingSections && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                {t("enrollDialog.loadingSections")}
              </p>
            )}
            {!isLoadingSections && sectionsError && (
              <p className="text-xs text-destructive">{sectionsError}</p>
            )}
            {!isLoadingSections &&
              !sectionsError &&
              clubId &&
              eligibleSections.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("enrollDialog.emptySections")}
                </p>
              )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("enrollDialog.cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting
                ? t("enrollDialog.enrolling")
                : t("enrollDialog.enroll")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
