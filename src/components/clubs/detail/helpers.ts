import type { Unit } from "@/lib/api/units";
import {
  detectSectionKind,
  getSectionMeta,
  type ClubFull,
  type ClubSectionRaw,
  type SectionView,
} from "./types";

export function getClubInitials(name: string | null | undefined): string {
  if (!name) return "CL";
  const cleaned = name.trim();
  if (!cleaned) return "CL";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function getClubCode(club: ClubFull): string {
  const id = club.club_id ?? club.id;
  if (id == null) return "—";
  return `CLB-${String(id).padStart(3, "0")}`;
}

export function getClubCoordinates(
  club: ClubFull,
): { lat: number; lng: number } | null {
  const lat = club.coordinates?.lat ?? club.latitude;
  const lng = club.coordinates?.lng ?? club.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}

export function getClubLocations(club: ClubFull) {
  return {
    localField:
      club.local_fields?.name ?? club.local_field?.name ?? null,
    district: club.districts?.name ?? club.district?.name ?? null,
    church: club.churches?.name ?? club.church?.name ?? null,
  };
}

export function getRawSections(club: ClubFull): ClubSectionRaw[] {
  return club.club_sections ?? club.sections ?? [];
}

export function getFoundedYear(club: ClubFull): number | null {
  if (!club.created_at) return null;
  const date = new Date(club.created_at);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear();
}

export function buildSectionViews(
  club: ClubFull,
  units: Unit[],
): SectionView[] {
  const rawSections = getRawSections(club);

  return rawSections
    .map((raw) => {
      const kind = detectSectionKind(raw);
      const meta = getSectionMeta(kind);
      const sectionId = raw.club_section_id ?? null;
      const sectionUnits = sectionId
        ? units.filter((u) => u.club_section_id === sectionId && u.active)
        : [];
      const members = sectionUnits.reduce(
        (acc, u) =>
          acc + (u.unit_members?.filter((m) => m.active).length ?? 0),
        0,
      );
      const label = raw.name?.trim() || raw.club_type?.name || meta.label;
      const capacity = raw.souls_target ?? null;

      return {
        raw,
        kind,
        meta,
        sectionId,
        label,
        range: meta.range,
        active: raw.active !== false,
        members,
        units: sectionUnits,
        unitsCount: sectionUnits.length,
        capacity,
      } satisfies SectionView;
    })
    .sort((a, b) => {
      const order: Record<typeof a.kind, number> = {
        adventurers: 0,
        pathfinders: 1,
        master_guilds: 2,
        unknown: 3,
      };
      return order[a.kind] - order[b.kind];
    });
}

export function getTotalMembers(sections: SectionView[]): number {
  return sections.reduce((acc, s) => acc + s.members, 0);
}

export function getTotalCapacity(sections: SectionView[]): number | null {
  let total = 0;
  let hasAny = false;
  for (const s of sections) {
    if (s.capacity != null && s.capacity > 0) {
      total += s.capacity;
      hasAny = true;
    }
  }
  return hasAny ? total : null;
}

export function pctOf(
  numerator: number,
  denominator: number | null | undefined,
): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 100));
}

export function getActiveUnits(units: Unit[]): Unit[] {
  return units.filter((u) => u.active);
}

export function countUnitMembers(unit: Unit): number {
  return unit.unit_members?.filter((m) => m.active).length ?? 0;
}

export function getUnitLeaderName(unit: Unit): string {
  const user = unit.users_units_captain_idTousers;
  if (!user) return "Sin líder";
  const parts = [user.name, user.paternal_last_name].filter(Boolean);
  return parts.join(" ").trim() || "Sin líder";
}

export function getUnitLeaderInitials(unit: Unit): string {
  const user = unit.users_units_captain_idTousers;
  if (!user?.name) return "?";
  const first = user.name?.[0] ?? "";
  const last = user.paternal_last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}
