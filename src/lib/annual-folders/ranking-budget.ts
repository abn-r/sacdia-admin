import type { AnnualRankingConfig } from "@/lib/api/annual-rankings";
import type { LocalField } from "@/lib/api/geography";

type TemplateScope = {
  owner_union_id?: number | null;
  owner_local_field_id?: number | null;
  ecclesiastical_year_id: number;
  club_type_id: number;
};

function componentMatchesAnnualFolder(componentKey: string): boolean {
  return (
    componentKey === "annual_evidence_folder" || componentKey === "annual_folder"
  );
}

export function annualFolderMaxPointsFromRankingConfig(
  config: AnnualRankingConfig | undefined,
): number | null {
  if (!config) return null;

  for (const axis of config.axes ?? []) {
    const component = axis.components.find((item) =>
      componentMatchesAnnualFolder(item.component_key),
    );
    if (component) return component.max_points;
  }

  const legacyComponent = config.components.find((item) =>
    componentMatchesAnnualFolder(item.component_key),
  );
  return legacyComponent?.max_points ?? null;
}

export function resolveAnnualFolderMaxPointsForTemplateScope(
  scope: TemplateScope,
  configs: AnnualRankingConfig[],
  localFields: LocalField[],
): number | null {
  const commonMatch = (config: AnnualRankingConfig) =>
    config.ecclesiastical_year_id === scope.ecclesiastical_year_id &&
    config.club_type_id === scope.club_type_id;

  if (scope.owner_union_id != null) {
    return annualFolderMaxPointsFromRankingConfig(
      configs.find(
        (config) =>
          commonMatch(config) &&
          config.union_id === scope.owner_union_id &&
          config.local_field_id == null,
      ),
    );
  }

  if (scope.owner_local_field_id == null) return null;

  const localField = localFields.find(
    (field) => field.local_field_id === scope.owner_local_field_id,
  );
  const unionConfig =
    localField?.union_id == null
      ? undefined
      : configs.find(
          (config) =>
            commonMatch(config) &&
            config.union_id === localField.union_id &&
            config.local_field_id == null,
        );

  if (unionConfig) {
    return annualFolderMaxPointsFromRankingConfig(unionConfig);
  }

  return annualFolderMaxPointsFromRankingConfig(
    configs.find(
      (config) =>
        commonMatch(config) &&
        config.union_id == null &&
        config.local_field_id === scope.owner_local_field_id,
    ),
  );
}

export function folderTemplateSectionPointsTotal(
  sections: Array<{ max_points: number }> | null | undefined,
): number {
  return (sections ?? []).reduce(
    (sum, section) => sum + Number(section.max_points || 0),
    0,
  );
}
