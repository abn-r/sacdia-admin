import type { AdminClubIdealRow } from "@/lib/catalogs/club-ideals/types";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";

function normalizeClubTypeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Canonical SACDIA order: Aventureros → Conquistadores → Guías Mayores */
export function getClubTypeSortIndexByName(name: string): number {
  const slug = normalizeClubTypeName(name);
  if (slug.includes("aventur") || slug.includes("adventur")) return 0;
  if (slug.includes("conquist") || slug.includes("pathfind")) return 1;
  if (
    slug.includes("guia") ||
    slug.includes("mayor") ||
    slug.includes("master") ||
    slug.includes("guild")
  ) {
    return 2;
  }
  return 99;
}

export function getClubTypeSortIndex(
  clubTypeId: number,
  clubTypeName: string,
  clubTypes: AdminClubType[],
): number {
  const fromCatalog = clubTypes.findIndex((type) => type.club_type_id === clubTypeId);
  if (fromCatalog >= 0) {
    const catalogName = clubTypes[fromCatalog]?.name ?? clubTypeName;
    return getClubTypeSortIndexByName(catalogName);
  }
  return getClubTypeSortIndexByName(clubTypeName);
}

export function sortClubIdealsByTypeAndOrder(
  rows: AdminClubIdealRow[],
  clubTypes: AdminClubType[],
): AdminClubIdealRow[] {
  return [...rows].sort((a, b) => {
    const typeDiff =
      getClubTypeSortIndex(a.club_type_id, a.club_type_name, clubTypes) -
      getClubTypeSortIndex(b.club_type_id, b.club_type_name, clubTypes);
    if (typeDiff !== 0) return typeDiff;
    if (a.ideal_order !== b.ideal_order) return a.ideal_order - b.ideal_order;
    return a.name.localeCompare(b.name, "es");
  });
}

export function sortClubTypesForDisplay(clubTypes: AdminClubType[]): AdminClubType[] {
  return [...clubTypes].sort(
    (a, b) => getClubTypeSortIndexByName(a.name) - getClubTypeSortIndexByName(b.name),
  );
}

type ClassLikeRow = {
  name?: unknown;
  club_type_id?: unknown;
};

function readClassName(row: ClassLikeRow): string {
  return typeof row.name === "string" ? row.name : "";
}

function readClubTypeId(row: ClassLikeRow): number {
  const raw = row.club_type_id;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Aventureros → Conquistadores → Guías Mayores, then A–Z by class name. */
export function sortClassesByClubTypeAndName<T extends ClassLikeRow>(
  rows: T[],
  clubTypes: AdminClubType[],
): T[] {
  const typeNameById = new Map(clubTypes.map((type) => [type.club_type_id, type.name]));

  return [...rows].sort((a, b) => {
    const aTypeName = typeNameById.get(readClubTypeId(a)) ?? "";
    const bTypeName = typeNameById.get(readClubTypeId(b)) ?? "";
    const typeDiff =
      getClubTypeSortIndex(readClubTypeId(a), aTypeName, clubTypes) -
      getClubTypeSortIndex(readClubTypeId(b), bTypeName, clubTypes);
    if (typeDiff !== 0) return typeDiff;
    return readClassName(a).localeCompare(readClassName(b), "es");
  });
}

export type ClassModuleParentOption = {
  class_id: number;
  name: string;
  club_type_id: number;
};

function readClassModuleClassId(row: { class_id?: unknown }): number {
  const raw = row.class_id;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clubTypeNameById(clubTypeId: number, clubTypes: AdminClubType[]): string {
  return clubTypes.find((type) => type.club_type_id === clubTypeId)?.name ?? "";
}

export function sortClassModuleParentsForDisplay(
  parents: ClassModuleParentOption[],
  clubTypes: AdminClubType[],
): ClassModuleParentOption[] {
  return [...parents].sort((a, b) => {
    const typeDiff =
      getClubTypeSortIndex(a.club_type_id, clubTypeNameById(a.club_type_id, clubTypes), clubTypes) -
      getClubTypeSortIndex(b.club_type_id, clubTypeNameById(b.club_type_id, clubTypes), clubTypes);
    if (typeDiff !== 0) return typeDiff;
    return a.name.localeCompare(b.name, "es");
  });
}

/** Aventureros → Conquistadores → Guías Mayores, then class name, then module name. */
export function sortClassModulesByClubTypeClassAndName<T extends ClassLikeRow & { class_id?: unknown }>(
  rows: T[],
  parentClasses: ClassModuleParentOption[],
  clubTypes: AdminClubType[],
): T[] {
  const classById = new Map(parentClasses.map((parent) => [parent.class_id, parent]));

  return [...rows].sort((a, b) => {
    const aParent = classById.get(readClassModuleClassId(a));
    const bParent = classById.get(readClassModuleClassId(b));
    const typeDiff =
      getClubTypeSortIndex(
        aParent?.club_type_id ?? 0,
        clubTypeNameById(aParent?.club_type_id ?? 0, clubTypes),
        clubTypes,
      ) -
      getClubTypeSortIndex(
        bParent?.club_type_id ?? 0,
        clubTypeNameById(bParent?.club_type_id ?? 0, clubTypes),
        clubTypes,
      );
    if (typeDiff !== 0) return typeDiff;
    const classDiff = (aParent?.name ?? "").localeCompare(bParent?.name ?? "", "es");
    if (classDiff !== 0) return classDiff;
    return readClassName(a).localeCompare(readClassName(b), "es");
  });
}

export type ClassSectionModuleOption = {
  module_id: number;
  name: string;
  class_id: number;
  class_name: string;
  club_type_id: number;
};

function readSectionModuleId(row: { module_id?: unknown }): number {
  const raw = row.module_id;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function deriveClassOptionsFromSectionModules(
  modules: ClassSectionModuleOption[],
  clubTypes: AdminClubType[],
): ClassModuleParentOption[] {
  const byId = new Map<number, ClassModuleParentOption>();
  for (const module of modules) {
    if (!byId.has(module.class_id)) {
      byId.set(module.class_id, {
        class_id: module.class_id,
        name: module.class_name,
        club_type_id: module.club_type_id,
      });
    }
  }
  return sortClassModuleParentsForDisplay([...byId.values()], clubTypes);
}

export function sortClassSectionModulesForDisplay(
  modules: ClassSectionModuleOption[],
  clubTypes: AdminClubType[],
): ClassSectionModuleOption[] {
  return [...modules].sort((a, b) => {
    const typeDiff =
      getClubTypeSortIndex(a.club_type_id, clubTypeNameById(a.club_type_id, clubTypes), clubTypes) -
      getClubTypeSortIndex(b.club_type_id, clubTypeNameById(b.club_type_id, clubTypes), clubTypes);
    if (typeDiff !== 0) return typeDiff;
    const classDiff = a.class_name.localeCompare(b.class_name, "es");
    if (classDiff !== 0) return classDiff;
    return a.name.localeCompare(b.name, "es");
  });
}

/** Aventureros → Conquistadores → Guías Mayores, then class, module, section name. */
export function sortClassSectionsByClubTypeClassModuleAndName<
  T extends ClassLikeRow & { module_id?: unknown },
>(
  rows: T[],
  parentModules: ClassSectionModuleOption[],
  clubTypes: AdminClubType[],
): T[] {
  const moduleById = new Map(parentModules.map((module) => [module.module_id, module]));

  return [...rows].sort((a, b) => {
    const aModule = moduleById.get(readSectionModuleId(a));
    const bModule = moduleById.get(readSectionModuleId(b));
    const typeDiff =
      getClubTypeSortIndex(
        aModule?.club_type_id ?? 0,
        clubTypeNameById(aModule?.club_type_id ?? 0, clubTypes),
        clubTypes,
      ) -
      getClubTypeSortIndex(
        bModule?.club_type_id ?? 0,
        clubTypeNameById(bModule?.club_type_id ?? 0, clubTypes),
        clubTypes,
      );
    if (typeDiff !== 0) return typeDiff;
    const classDiff = (aModule?.class_name ?? "").localeCompare(bModule?.class_name ?? "", "es");
    if (classDiff !== 0) return classDiff;
    const moduleDiff = (aModule?.name ?? "").localeCompare(bModule?.name ?? "", "es");
    if (moduleDiff !== 0) return moduleDiff;
    return readClassName(a).localeCompare(readClassName(b), "es");
  });
}
