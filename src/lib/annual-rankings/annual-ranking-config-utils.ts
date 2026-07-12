import {
  DEFAULT_AXES,
  axisKeyForComponent,
} from "@/lib/annual-rankings/ranking-config-catalog";
import type { AnnualRankingConfigFormValues } from "@/lib/annual-rankings/annual-ranking-config-validation";
import type { AnnualRankingConfig } from "@/lib/api/annual-rankings";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";

export type RankingScopeType = AnnualRankingConfigFormValues["scope_type"];

export function scopeTypeFromConfig(
  config: AnnualRankingConfig,
): RankingScopeType {
  return config.union_id != null ? "union" : "local_field";
}

export function toFormValues(
  config: AnnualRankingConfig | undefined,
  fallback: Pick<
    AnnualRankingConfigFormValues,
    | "scope_type"
    | "union_id"
    | "local_field_id"
    | "ecclesiastical_year_id"
    | "club_type_id"
  >,
): AnnualRankingConfigFormValues {
  if (config) {
    return {
      annual_ranking_config_id: config.annual_ranking_config_id,
      scope_type: scopeTypeFromConfig(config),
      union_id: config.union_id,
      local_field_id: config.local_field_id,
      ecclesiastical_year_id: config.ecclesiastical_year_id,
      club_type_id: config.club_type_id,
      max_points: config.max_points,
      axes:
        config.axes && config.axes.length > 0
          ? config.axes.map((axis, axisIndex) => ({
              axis_key: axis.axis_key,
              label: axis.label,
              max_points: axis.max_points,
              sort_order: axis.sort_order ?? axisIndex,
              components: axis.components.map((component, componentIndex) => ({
                component_key: component.component_key,
                label: component.label,
                max_points: component.max_points,
                sort_order: component.sort_order ?? componentIndex,
              })),
            }))
          : DEFAULT_AXES.map((axis) => ({
              ...axis,
              max_points: config.components
                .filter(
                  (component) =>
                    axisKeyForComponent(component.component_key) ===
                    axis.axis_key,
                )
                .reduce((sum, component) => sum + component.max_points, 0),
              components: config.components
                .filter(
                  (component) =>
                    axisKeyForComponent(component.component_key) ===
                    axis.axis_key,
                )
                .map((component, componentIndex) => ({
                  component_key: component.component_key,
                  label: component.label,
                  max_points: component.max_points,
                  sort_order: component.sort_order ?? componentIndex,
                })),
            })),
    };
  }

  return {
    ...fallback,
    max_points: 10000,
    axes: DEFAULT_AXES,
  };
}

export function configLabel(
  config: AnnualRankingConfig,
  unions: Union[],
  localFields: LocalField[],
  clubTypes: ClubType[],
  years: EcclesiasticalYear[],
) {
  const scopeName =
    config.union_id != null
      ? (unions.find((union) => union.union_id === config.union_id)?.name ??
        config.union?.name ??
        `Unión #${config.union_id}`)
      : (localFields.find(
          (field) => field.local_field_id === config.local_field_id,
        )?.name ??
        config.local_field?.name ??
        `Campo #${config.local_field_id}`);
  const year =
    years.find(
      (item) => item.ecclesiastical_year_id === config.ecclesiastical_year_id,
    )?.name ?? String(config.ecclesiastical_year_id);
  const clubType =
    clubTypes.find((type) => type.club_type_id === config.club_type_id)?.name ??
    String(config.club_type_id);

  return { scopeName, year, clubType };
}

export function buildInitialScope(
  unions: Union[],
  localFields: LocalField[],
  clubTypes: ClubType[],
  ecclesiasticalYears: EcclesiasticalYear[],
): Pick<
  AnnualRankingConfigFormValues,
  | "scope_type"
  | "union_id"
  | "local_field_id"
  | "ecclesiastical_year_id"
  | "club_type_id"
> {
  return {
    scope_type: (unions.length > 0 ? "union" : "local_field") as RankingScopeType,
    union_id: unions[0]?.union_id ?? null,
    local_field_id: localFields[0]?.local_field_id ?? 1,
    ecclesiastical_year_id:
      ecclesiasticalYears.find((year) => year.active)?.ecclesiastical_year_id ??
      ecclesiasticalYears[0]?.ecclesiastical_year_id ??
      1,
    club_type_id: clubTypes[0]?.club_type_id ?? 1,
  };
}
