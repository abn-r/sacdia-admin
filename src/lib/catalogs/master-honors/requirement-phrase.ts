import type { MasterHonorRuleGroupPayload } from "@/lib/api/phase-e-catalogs";

/** `next-intl` style translator for `admin.catalogs.masterHonor.phrase.*`. */
export type PhraseTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export interface PhraseLookups {
  honorName: (honorId: number) => string | undefined;
  categoryName: (categoryId: number) => string | undefined;
}

export interface RequirementPhrase {
  /** The requirement read as a sentence, e.g. "3 especialidades de Estudio de la naturaleza". */
  phrase: string;
  /** Short qualifier under it, e.g. "Cantidad por categoría". */
  kind: string;
}

function optionText(
  option: MasterHonorRuleGroupPayload["options"][number],
  lookups: PhraseLookups,
): string {
  const label = option.label.trim();
  if (label) return label;
  const names = (option.honor_ids ?? [])
    .map((id) => lookups.honorName(id))
    .filter((name): name is string => Boolean(name));
  return names.join(" + ");
}

/**
 * Reads one requirement group as a sentence instead of form fields:
 *  - by category: "{n} especialidades de {category}"
 *  - explicit options: a single option as is, "A o B" when one of two is enough,
 *    "{n} de: A, B, C" otherwise, "Todas: A, B" when every option is needed.
 */
export function describeRequirementGroup(
  group: MasterHonorRuleGroupPayload,
  lookups: PhraseLookups,
  t: PhraseTranslator,
): RequirementPhrase {
  const minimum = Math.max(1, group.minimum_required || 1);

  if (group.group_type === "CATEGORY_COUNT") {
    const category =
      (group.honors_category_id ? lookups.categoryName(group.honors_category_id) : undefined) ??
      t("anyCategory");
    return {
      phrase: t("categoryCount", { count: minimum, category }),
      kind: t("kindCategory"),
    };
  }

  const options = group.options
    .filter((option) => option.active !== false)
    .map((option) => optionText(option, lookups))
    .filter((text) => text.length > 0);
  const total = options.length;
  const kind = t("kindExplicit", { count: total });

  if (total === 0) return { phrase: t("explicitEmpty"), kind };
  if (total === 1) return { phrase: options[0] as string, kind };
  if (minimum >= total) return { phrase: t("explicitAll", { list: options.join(", ") }), kind };
  if (minimum === 1 && total === 2) {
    return { phrase: t("explicitEither", { a: options[0] as string, b: options[1] as string }), kind };
  }
  return { phrase: t("explicitSome", { count: minimum, list: options.join(", ") }), kind };
}

/** Number of groups the honor needs: only active groups count. */
export function countActiveGroups(groups: readonly MasterHonorRuleGroupPayload[]): number {
  return groups.filter((group) => group.active !== false).length;
}
