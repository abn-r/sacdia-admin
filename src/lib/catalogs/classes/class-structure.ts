import type { ClassModule, ClassSection } from "@/lib/api/classes";

type AnyRecord = Record<string, unknown>;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function compareByOrderThenName(
  aOrder: number | null | undefined,
  bOrder: number | null | undefined,
  aName: string,
  bName: string,
): number {
  const safeAOrder = aOrder ?? Number.MAX_SAFE_INTEGER;
  const safeBOrder = bOrder ?? Number.MAX_SAFE_INTEGER;
  if (safeAOrder !== safeBOrder) return safeAOrder - safeBOrder;
  return aName.localeCompare(bName, "es");
}

const MODULE_NUMBER_PATTERN = /M[oó]dulo\s+(\d+)/i;

/** Parses "Módulo 6 — …" from name, title or description. */
export function extractModuleNumberFromText(
  ...values: Array<string | null | undefined>
): number | null {
  for (const value of values) {
    if (!value) continue;
    const match = value.match(MODULE_NUMBER_PATTERN);
    if (!match) continue;
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function resolveModuleSortOrder(module: ClassModule): number {
  const fromLabel = extractModuleNumberFromText(
    module.description,
    module.name,
    module.title,
  );
  if (fromLabel != null) return fromLabel;
  if (module.display_order != null) return module.display_order;
  return Number.MAX_SAFE_INTEGER;
}

function normalizeSection(raw: unknown, idx: number): ClassSection {
  const section = (raw && typeof raw === "object" ? raw : {}) as AnyRecord;
  const sectionId = toPositiveNumber(section.section_id) ?? idx + 1;
  const name = toText(section.name) ?? toText(section.title) ?? `Sección ${sectionId}`;

  return {
    section_id: sectionId,
    name,
    title: name,
    description: toText(section.description),
    display_order: toPositiveNumber(section.display_order) ?? undefined,
    active: section.active !== false,
    requirements: Array.isArray(section.requirements)
      ? section.requirements.map((req, reqIdx) => {
          const requirement = (req && typeof req === "object" ? req : {}) as AnyRecord;
          return {
            requirement_id: toPositiveNumber(requirement.requirement_id) ?? reqIdx + 1,
            description:
              toText(requirement.description) ??
              toText(requirement.name) ??
              `Requisito ${reqIdx + 1}`,
            display_order: toPositiveNumber(requirement.display_order) ?? undefined,
            active: requirement.active !== false,
          };
        })
      : undefined,
  };
}

function normalizeModule(raw: unknown, idx: number): ClassModule {
  const moduleRecord = (raw && typeof raw === "object" ? raw : {}) as AnyRecord;
  const moduleId = toPositiveNumber(moduleRecord.module_id) ?? idx + 1;
  const name =
    toText(moduleRecord.name) ?? toText(moduleRecord.title) ?? `Módulo ${moduleId}`;
  const rawSections = Array.isArray(moduleRecord.sections)
    ? moduleRecord.sections
    : Array.isArray(moduleRecord.class_sections)
      ? moduleRecord.class_sections
      : [];

  const sections = rawSections.map((section, sectionIdx) => normalizeSection(section, sectionIdx));

  return {
    module_id: moduleId,
    name,
    title: name,
    description: toText(moduleRecord.description),
    display_order: toPositiveNumber(moduleRecord.display_order) ?? undefined,
    sections_count: sections.length,
    active: moduleRecord.active !== false,
    sections,
  };
}

export function extractClassDetailRoot(payload: unknown): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;

  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (nested.class_id != null || nested.name != null) return nested;
    if (nested.data && typeof nested.data === "object") return nested.data as AnyRecord;
  }

  if (root.class_id != null || root.name != null) return root;
  return null;
}

export function extractClassModulesFromDetail(classData: AnyRecord): ClassModule[] {
  const rawModules = Array.isArray(classData.class_modules)
    ? classData.class_modules
    : Array.isArray(classData.modules)
      ? classData.modules
      : [];

  return rawModules.map((module, idx) => normalizeModule(module, idx));
}

export function sortClassStructureModules(modules: ClassModule[]): ClassModule[] {
  return [...modules]
    .sort((a, b) => {
      const orderDiff = resolveModuleSortOrder(a) - resolveModuleSortOrder(b);
      if (orderDiff !== 0) return orderDiff;
      return (a.title ?? a.name).localeCompare(b.title ?? b.name, "es");
    })
    .map((module) => ({
      ...module,
      sections: [...(module.sections ?? [])].sort((a, b) =>
        compareByOrderThenName(
          a.display_order,
          b.display_order,
          a.title ?? a.name ?? "",
          b.title ?? b.name ?? "",
        ),
      ),
    }));
}
