"use client";

import { ClassEnrollmentsChart } from "@/components/dashboard/class-enrollments-chart";
import {
  BentoAreaSparkline,
  BentoBarChart,
  BentoDonut,
  BentoPillMeter,
  BentoSplitBar,
} from "@/components/dashboard/operations-bento-mini-charts";
import {
  OperationsBentoMetric,
  OperationsBentoTile,
} from "@/components/dashboard/operations-bento-tile";
import type { ClassBreakdownItem, DashboardMetrics } from "@/lib/api/operations-dashboard";

export type OperationsBentoLabels = {
  operationTitle: string;
  operationSub: string;
  adminTitle: string;
  adminActive: string;
  adminInactive: string;
  reportsTitle: string;
  reportsPeriod: string;
  reportsNoMonth: string;
  peopleTitle: string;
  peoplePlatformActive: string;
  peoplePlatformInactive: string;
  queuesTitle: string;
  queuesFooter: string;
  honorsTitle: string;
  honorsInProgress: string;
  honorsPending: string;
  honorsApproved: string;
  honorsUnavailable: string;
  activitiesTitle: string;
  activitiesJoint: string;
  activitiesSections: string;
  formationTitle: string;
  formationEnrollments: string;
  formationPeople: string;
  chartSubmitted: string;
  chartDraft: string;
  chartGenerated: string;
  chartMissing: string;
  chartExpected: string;
  chartRegistered: string;
  chartJoint: string;
  chartSections: string;
};

export interface OperationsDashboardBentoClientProps {
  summary: DashboardMetrics;
  classItems: ClassBreakdownItem[];
  labels: OperationsBentoLabels;
  formatted: {
    operationalClubs: string;
    operationalSections: string;
    operationalRate: string;
    nonOperationalClubs: string;
    adminTotal: string;
    adminActive: string;
    adminInactive: string;
    institutionalActive: string;
    platformActive: string;
    platformInactive: string;
    coverage: string;
    expected: string;
    submitted: string;
    draft: string;
    generated: string;
    missing: string;
    roleAssignments: string;
    transfers: string;
    classValidations: string;
    honorsReview: string;
    annualFolders: string;
    honorsInProgress: string;
    honorsPending: string;
    honorsApproved: string;
    activitiesRegistered: string;
    activitiesJoint: string;
    activitiesSections: string;
    totalEnrollments: string;
    distinctPeople: string;
  };
  reportingMonthLabel: string | null;
  honorsUnavailable: boolean;
};

export function OperationsDashboardBentoClient({
  summary,
  classItems,
  labels,
  formatted,
  reportingMonthLabel,
  honorsUnavailable,
}: OperationsDashboardBentoClientProps) {
  const operationSpark = [
    { label: "operational", value: summary.operations.operational_clubs },
    { label: "nonOperational", value: summary.operations.non_operational_clubs },
    { label: "sections", value: summary.operations.operational_sections },
  ];

  const reportBars = [
    { key: "submitted", label: labels.chartSubmitted, value: summary.monthly_reports.submitted_sections },
    { key: "draft", label: labels.chartDraft, value: summary.monthly_reports.draft_sections },
    { key: "generated", label: labels.chartGenerated, value: summary.monthly_reports.generated_sections },
    { key: "missing", label: labels.chartMissing, value: summary.monthly_reports.missing_sections },
    { key: "expected", label: labels.chartExpected, value: summary.monthly_reports.expected_sections },
  ];

  const activityBars = [
    { key: "registered", label: labels.chartRegistered, value: summary.activities.registered },
    { key: "joint", label: labels.chartJoint, value: summary.activities.joint_registered },
    { key: "sections", label: labels.chartSections, value: summary.activities.distinct_participating_sections },
  ];

  const queuePills = [
    { key: "roles", value: summary.queues.role_assignments_pending },
    { key: "transfers", value: summary.queues.transfers_pending },
    { key: "classes", value: summary.queues.class_validations_pending },
    { key: "honors", value: summary.queues.honors_review_pending ?? 0 },
    { key: "folders", value: summary.queues.annual_folders_pending_union },
  ];

  const honorsSegments = honorsUnavailable
    ? []
    : [
        {
          key: "progress",
          label: labels.honorsInProgress,
          value: summary.honors.in_progress ?? 0,
          color: "hsl(var(--chart-1))",
        },
        {
          key: "review",
          label: labels.honorsPending,
          value: summary.honors.pending_review ?? 0,
          color: "hsl(var(--chart-2) / 0.65)",
        },
        {
          key: "approved",
          label: labels.honorsApproved,
          value: summary.honors.approved ?? 0,
          color: "hsl(var(--chart-2))",
        },
      ];

  return (
    <div
      data-bento-grid="operations-dashboard"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:auto-rows-fr"
    >
      {/* Fila 1: pequeño · pequeño · ancho */}
      <OperationsBentoTile
        className="sm:col-span-1 xl:col-span-1"
        title={labels.operationTitle}
        value={formatted.operationalClubs}
        subValue={`${formatted.operationalSections} · ${formatted.operationalRate}`}
        subValueTone="positive"
        footer={labels.operationSub}
        visual={<BentoAreaSparkline points={operationSpark} />}
      />

      <OperationsBentoTile
        className="sm:col-span-1 xl:col-span-1"
        title={labels.adminTitle}
        value={formatted.adminTotal}
        subValue={`${formatted.adminActive} / ${formatted.adminInactive}`}
        visual={
          <BentoSplitBar
            segments={[
              {
                key: "active",
                label: labels.adminActive,
                value: summary.administrative_clubs.active,
                color: "hsl(var(--chart-1))",
              },
              {
                key: "inactive",
                label: labels.adminInactive,
                value: summary.administrative_clubs.inactive,
                color: "hsl(var(--muted-foreground) / 0.35)",
              },
            ]}
          />
        }
      />

      <OperationsBentoTile
        className="sm:col-span-2 xl:col-span-2"
        title={labels.reportsTitle}
        value={formatted.coverage}
        subValue={
          reportingMonthLabel
            ? `${labels.reportsPeriod}: ${reportingMonthLabel}`
            : labels.reportsNoMonth
        }
        footer={`${formatted.submitted} / ${formatted.expected}`}
        visual={
          <BentoBarChart
            items={reportBars}
            highlightKey={summary.monthly_reports.missing_sections > 0 ? "missing" : "submitted"}
          />
        }
      />

      {/* Fila 2: pequeño · pequeño · ancho */}
      <OperationsBentoTile
        className="sm:col-span-1 xl:col-span-1"
        title={labels.peopleTitle}
        value={formatted.institutionalActive}
        subValue={`${labels.peoplePlatformActive} ${formatted.platformActive}`}
        footer={`${labels.peoplePlatformInactive} ${formatted.platformInactive}`}
        visual={
          <BentoDonut
            segments={[
              {
                key: "active",
                label: labels.peoplePlatformActive,
                value: summary.people.platform_accounts.active,
                color: "hsl(var(--chart-1))",
              },
              {
                key: "inactive",
                label: labels.peoplePlatformInactive,
                value: summary.people.platform_accounts.inactive,
                color: "hsl(var(--muted-foreground) / 0.35)",
              },
            ]}
          />
        }
      />

      <OperationsBentoTile
        className="sm:col-span-1 xl:col-span-1"
        title={labels.queuesTitle}
        value={formatted.roleAssignments}
        subValue={`${labels.queuesFooter}: ${formatted.transfers}`}
        subValueTone={
          summary.queues.role_assignments_pending > 0 ? "warning" : "default"
        }
        visual={<BentoPillMeter items={queuePills} />}
        footer={`${formatted.classValidations} · ${formatted.honorsReview} · ${formatted.annualFolders}`}
      />

      <OperationsBentoTile
        className="sm:col-span-2 xl:col-span-2"
        title={labels.formationTitle}
        value={formatted.totalEnrollments}
        subValue={`${labels.formationPeople}: ${formatted.distinctPeople}`}
        visual={
          <div className="rounded-2xl bg-muted/15 p-3 ring-1 ring-foreground/5">
            <ClassEnrollmentsChart items={classItems} />
          </div>
        }
      />

      {/* Fila 3: complementos */}
      <OperationsBentoTile
        className="sm:col-span-1 xl:col-span-1"
        title={labels.honorsTitle}
        value={honorsUnavailable ? "—" : formatted.honorsApproved}
        subValue={honorsUnavailable ? labels.honorsUnavailable : formatted.honorsPending}
        visual={
          honorsUnavailable ? null : (
            <BentoDonut segments={honorsSegments} />
          )
        }
      />

      <OperationsBentoTile
        className="sm:col-span-1 xl:col-span-1"
        title={labels.activitiesTitle}
        value={formatted.activitiesRegistered}
        subValue={`${labels.activitiesJoint}: ${formatted.activitiesJoint}`}
        footer={`${labels.activitiesSections}: ${formatted.activitiesSections}`}
        visual={<BentoBarChart items={activityBars} highlightKey="registered" />}
      />

      <article
        className="flex h-full min-h-[220px] flex-col gap-4 rounded-3xl border border-foreground/5 bg-gradient-to-br from-card via-card to-muted/15 p-5 ring-1 ring-foreground/5 sm:col-span-2 sm:p-6 xl:col-span-2"
      >
        <header>
          <p className="font-medium text-muted-foreground text-sm">{labels.operationTitle}</p>
          <p className="mt-1 text-muted-foreground text-xs">{labels.operationSub}</p>
        </header>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <OperationsBentoMetric label={labels.adminActive} value={formatted.adminActive} />
          <OperationsBentoMetric label={labels.adminInactive} value={formatted.adminInactive} />
          <OperationsBentoMetric label={labels.reportsTitle} value={formatted.missing} />
          <OperationsBentoMetric label={labels.formationEnrollments} value={formatted.distinctPeople} />
        </div>
        <BentoSplitBar
          segments={[
            {
              key: "operational",
              label: labels.operationTitle,
              value: summary.operations.operational_clubs,
              color: "hsl(var(--chart-2))",
            },
            {
              key: "nonOperational",
              label: labels.adminInactive,
              value: summary.operations.non_operational_clubs,
              color: "hsl(var(--muted-foreground) / 0.35)",
            },
          ]}
        />
      </article>
    </div>
  );
}
