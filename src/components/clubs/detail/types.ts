import type { Unit } from "@/lib/api/units";

export type ClubSectionRaw = {
  club_section_id?: number;
  club_type_id?: number;
  club_type?: { name?: string } | null;
  name?: string | null;
  active?: boolean;
  souls_target?: number | null;
  fee?: number | null;
  members_count?: number;
};

export type ClubLocationRef = { name?: string | null } | null | undefined;

export type ClubFull = {
  club_id?: number;
  id?: number;
  name?: string | null;
  description?: string | null;
  active?: boolean;
  local_field_id?: number;
  district_id?: number;
  church_id?: number;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coordinates?: { lat?: number; lng?: number } | null;
  created_at?: string | null;
  modified_at?: string | null;
  local_fields?: ClubLocationRef;
  districts?: ClubLocationRef;
  churches?: ClubLocationRef;
  local_field?: ClubLocationRef;
  district?: ClubLocationRef;
  church?: ClubLocationRef;
  club_sections?: ClubSectionRaw[];
  sections?: ClubSectionRaw[];
};

export type SectionKind =
  | "adventurers"
  | "pathfinders"
  | "master_guilds"
  | "unknown";

export type SectionTone = "rose" | "primary" | "warning" | "muted";

export interface SectionMetaEntry {
  kind: SectionKind;
  label: string;
  range: string;
  tone: SectionTone;
  swatch: string;
  pill: string;
  iconBg: string;
  barBg: string;
  donutHex: string;
}

const SECTION_META_BY_KIND: Record<SectionKind, SectionMetaEntry> = {
  adventurers: {
    kind: "adventurers",
    label: "Aventureros",
    range: "6–9 años",
    tone: "rose",
    swatch: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    pill: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    iconBg: "bg-rose-500 text-white",
    barBg: "bg-rose-500",
    donutHex: "var(--rose-donut, #f43f5e)",
  },
  pathfinders: {
    kind: "pathfinders",
    label: "Conquistadores",
    range: "10–15 años",
    tone: "primary",
    swatch: "bg-primary/15 text-primary",
    pill: "bg-primary/10 text-primary border-primary/20",
    iconBg: "bg-primary text-primary-foreground",
    barBg: "bg-primary",
    donutHex: "var(--color-primary)",
  },
  master_guilds: {
    kind: "master_guilds",
    label: "Guías Mayores",
    range: "16+ años",
    tone: "warning",
    swatch: "bg-warning/20 text-warning-foreground",
    pill: "bg-warning/15 text-warning-foreground border-warning/30",
    iconBg: "bg-warning text-warning-foreground",
    barBg: "bg-warning",
    donutHex: "var(--color-warning)",
  },
  unknown: {
    kind: "unknown",
    label: "Sección",
    range: "—",
    tone: "muted",
    swatch: "bg-muted text-muted-foreground",
    pill: "bg-muted text-muted-foreground border-border",
    iconBg: "bg-muted text-muted-foreground",
    barBg: "bg-muted-foreground/40",
    donutHex: "var(--color-muted-foreground)",
  },
};

function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function detectSectionKind(
  section: Pick<ClubSectionRaw, "club_type" | "name" | "club_type_id">,
): SectionKind {
  const candidates: string[] = [];
  if (section.club_type?.name) candidates.push(section.club_type.name);
  if (section.name) candidates.push(section.name);

  for (const raw of candidates) {
    const slug = normalizeName(raw);
    if (slug.includes("aventur") || slug.includes("adventur"))
      return "adventurers";
    if (slug.includes("conquist") || slug.includes("pathfind"))
      return "pathfinders";
    if (
      slug.includes("guia") ||
      slug.includes("guías") ||
      slug.includes("master") ||
      slug.includes("guild")
    )
      return "master_guilds";
  }
  return "unknown";
}

export function getSectionMeta(kind: SectionKind): SectionMetaEntry {
  return SECTION_META_BY_KIND[kind];
}

export interface SectionView {
  raw: ClubSectionRaw;
  kind: SectionKind;
  meta: SectionMetaEntry;
  sectionId: number | null;
  label: string;
  range: string;
  active: boolean;
  members: number;
  units: Unit[];
  unitsCount: number;
  capacity: number | null;
}
