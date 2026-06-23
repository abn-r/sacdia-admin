import type { AnnualRankingConfigFormValues } from "./annual-ranking-config-validation";

export const SECTION_CATALOG = [
  {
    axis_key: "administrative",
    label: "Cumplimiento Administrativo",
    description: "Evidencias, finanzas e informes institucionales",
    sort_order: 1,
    tone: "info" as const,
  },
  {
    axis_key: "operational",
    label: "Vida Operativa del Club",
    description: "Actividades, camporee, asistencia y uso de SACDIA",
    sort_order: 2,
    tone: "success" as const,
  },
] as const;

export const DEFAULT_AXES = [
  {
    axis_key: "administrative",
    label: "Cumplimiento Administrativo",
    max_points: 5000,
    sort_order: 1,
    components: [
      {
        component_key: "annual_evidence_folder",
        label: "Carpeta Anual de Evidencias",
        max_points: 3000,
        sort_order: 1,
      },
      {
        component_key: "finance_compliance",
        label: "Finanzas",
        max_points: 2000,
        sort_order: 2,
      },
    ],
  },
  {
    axis_key: "operational",
    label: "Vida Operativa del Club",
    max_points: 5000,
    sort_order: 2,
    components: [
      {
        component_key: "camporee_events",
        label: "Camporee",
        max_points: 2000,
        sort_order: 1,
      },
      {
        component_key: "activities_registered",
        label: "Actividades registradas",
        max_points: 1000,
        sort_order: 2,
      },
      {
        component_key: "attendance_participation",
        label: "Asistencia y participación",
        max_points: 1000,
        sort_order: 3,
      },
      {
        component_key: "sacdia_operational_usage",
        label: "Uso operativo de SACDIA",
        max_points: 1000,
        sort_order: 4,
      },
    ],
  },
] satisfies AnnualRankingConfigFormValues["axes"];

export const COMPONENT_CATALOG = [
  {
    component_key: "annual_evidence_folder",
    axis_key: "administrative",
    label: "Carpeta Anual de Evidencias",
  },
  {
    component_key: "monthly_reports_timeliness",
    axis_key: "administrative",
    label: "Entrega oportuna de informes mensuales",
  },
  {
    component_key: "finance_compliance",
    axis_key: "administrative",
    label: "Cumplimiento financiero",
  },
  {
    component_key: "institutional_data_completeness",
    axis_key: "administrative",
    label: "Información institucional completa",
  },
  {
    component_key: "activities_registered",
    axis_key: "operational",
    label: "Actividades registradas",
  },
  {
    component_key: "attendance_participation",
    axis_key: "operational",
    label: "Asistencia y participación",
  },
  {
    component_key: "camporee_events",
    axis_key: "operational",
    label: "Eventos y camporee",
  },
  {
    component_key: "class_investiture_progress",
    axis_key: "operational",
    label: "Avance de clases e investiduras",
  },
  {
    component_key: "sacdia_operational_usage",
    axis_key: "operational",
    label: "Uso operativo de SACDIA",
  },
] as const;

export function axisKeyForComponent(componentKey: string) {
  if (
    [
      "annual_folder",
      "annual_evidence_folder",
      "finance",
      "finance_compliance",
      "monthly_reports_timeliness",
      "institutional_data_completeness",
    ].includes(componentKey)
  ) {
    return "administrative";
  }

  return "operational";
}

export function sectionMeta(axisKey: string) {
  return (
    SECTION_CATALOG.find((section) => section.axis_key === axisKey) ?? {
      axis_key: axisKey,
      label: axisKey,
      description: "",
      sort_order: 99,
      tone: "info" as const,
    }
  );
}

export function defaultSubsectionForSection(axisKey: string) {
  const match = COMPONENT_CATALOG.find(
    (component) => component.axis_key === axisKey,
  );
  if (!match) return null;

  return {
    component_key: match.component_key,
    label: match.label,
    max_points: 1,
    sort_order: 1,
  };
}
