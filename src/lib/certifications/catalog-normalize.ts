type GenericRecord = Record<string, unknown>;

export function extractCertificationItems(payload: unknown): GenericRecord[] {
  if (Array.isArray(payload)) return payload as GenericRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as GenericRecord;
    if (Array.isArray(root.data)) return root.data as GenericRecord[];
    const nested = root.data;
    if (nested && typeof nested === "object" && Array.isArray((nested as GenericRecord).data)) {
      return (nested as GenericRecord).data as GenericRecord[];
    }
  }
  return [];
}

export function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeCertificationListItem(item: GenericRecord) {
  const modulesRaw = item.modules;
  const modulesCount =
    toPositiveNumber(item.modules_count) ??
    toPositiveNumber(item.modulesCount) ??
    (Array.isArray(modulesRaw) ? modulesRaw.length : null);

  const certificationId =
    toPositiveNumber(item.certification_id) ?? toPositiveNumber(item.id) ?? 0;

  return {
    certification_id: certificationId,
    name: toText(item.name) ?? `Certificación #${certificationId || "?"}`,
    description: toText(item.description),
    duration_weeks:
      toPositiveNumber(item.duration_weeks) ??
      toPositiveNumber(item.duration_hours) ??
      null,
    modules_count: modulesCount,
    active: item.active !== false,
  };
}

export function normalizeCertificationDetailModules(payload: unknown) {
  const root =
    payload && typeof payload === "object"
      ? ((payload as GenericRecord).data ?? payload)
      : null;

  if (!root || typeof root !== "object") {
    return [];
  }

  const record = root as GenericRecord;
  const modulesRaw = record.modules ?? record.certification_modules;
  if (!Array.isArray(modulesRaw)) {
    return [];
  }

  return modulesRaw
    .map((moduleRaw) => {
      if (!moduleRaw || typeof moduleRaw !== "object") return null;
      const mod = moduleRaw as GenericRecord;
      const moduleId = toPositiveNumber(mod.module_id) ?? toPositiveNumber(mod.id);
      if (!moduleId) return null;

      const sectionsRaw = mod.sections ?? mod.certification_sections;
      const sections = Array.isArray(sectionsRaw)
        ? sectionsRaw
            .map((sectionRaw) => {
              if (!sectionRaw || typeof sectionRaw !== "object") return null;
              const section = sectionRaw as GenericRecord;
              const sectionId =
                toPositiveNumber(section.section_id) ?? toPositiveNumber(section.id);
              if (!sectionId) return null;
              const label = toText(section.title) ?? toText(section.name) ?? `Sección #${sectionId}`;
              return {
                section_id: sectionId,
                title: label,
                description: toText(section.description),
                order: toPositiveNumber(section.order),
                is_required: section.is_required !== false,
              };
            })
            .filter((section): section is NonNullable<typeof section> => section !== null)
        : [];

      const moduleLabel = toText(mod.title) ?? toText(mod.name) ?? `Módulo #${moduleId}`;

      return {
        module_id: moduleId,
        title: moduleLabel,
        description: toText(mod.description),
        order: toPositiveNumber(mod.order),
        sections,
      };
    })
    .filter((module): module is NonNullable<typeof module> => module !== null);
}

export function extractCertificationDetailRoot(payload: unknown): GenericRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as GenericRecord;
  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as GenericRecord;
  }
  return root;
}
