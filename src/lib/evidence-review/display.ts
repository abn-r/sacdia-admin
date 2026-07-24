import type { EvidenceItem, EvidenceType } from "@/lib/api/evidence-review";

type EvidenceDisplayFields = Pick<
  EvidenceItem,
  "type" | "entity_name" | "section_name" | "entity_description" | "module_name"
>;

/** Class or specialty name shown in the entity column. */
export function getEvidenceEntityName(item: EvidenceDisplayFields): string {
  if (item.entity_name) return item.entity_name;
  if (item.type === "honor") return item.section_name;
  return "—";
}

/** Catalog section name (class evidence only). */
export function getEvidenceSectionName(item: EvidenceDisplayFields): string {
  if (item.type === "honor") return "—";
  return item.section_name || "—";
}

/** Section or specialty description. */
export function getEvidenceDescription(item: EvidenceDisplayFields): string {
  const value = item.entity_description?.trim();
  return value || "—";
}

/** Context line for approve/reject dialogs. */
export function getEvidenceContextLabel(item: EvidenceDisplayFields): string {
  if (item.type === "honor") {
    return getEvidenceEntityName(item);
  }

  const entity = item.entity_name;
  const section = item.section_name;
  const module = item.module_name;

  if (entity && section) {
    return module ? `${entity} — ${module} · ${section}` : `${entity} — ${section}`;
  }

  return section || entity || "—";
}

export function isHonorEvidence(type: EvidenceType): boolean {
  return type === "honor";
}
