"use client";

import { ClassEnrollmentsChart } from "@/components/dashboard/class-enrollments-chart";
import {
  BentoBarChart,
  BentoDonut,
  BentoSplitBar,
} from "@/components/dashboard/operations-bento-mini-charts";
import {
  OperationsBentoTile,
  OperationsStatRow,
} from "@/components/dashboard/operations-bento-tile";
import type { ClassBreakdownItem, DashboardMetrics } from "@/lib/api/operations-dashboard";

export type OperationsBentoLabels = {
  reportsTitle: string;
  reportsDescription: string;
  peopleTitle: string;
  peopleDescription: string;
  peoplePlatformActive: string;
  peoplePlatformInactive: string;
  queuesTitle: string;
  queuesDescription: string;
  queueRoles: string;
  queueTransfers: string;
  queueClasses: string;
  queueHonors: string;
  queueFolders: string;
  honorsTitle: string;
  honorsInProgress: string;
  honorsPending: string;
  honorsApproved: string;
  honorsUnavailable: string;
  activitiesTitle: string;
  activitiesDescription: string;
  activitiesJoint: string;
  activitiesSections: string;
  formationTitle: string;
  formationDescription: string;
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
    platformActive: string;
    platformInactive: string;
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
  };
  honorsUnavailable: boolean;
}

export function OperationsDashboardBentoClient({
  summary,
  classItems,
  labels,
  formatted,
  honorsUnavailable,
}: OperationsDashboardBentoClientProps) {
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

  const queueRows = [
    { key: "roles", label: labels.queueRoles, value: formatted.roleAssignments, raw: summary.queues.role_assignments_pending },
    { key: "transfers", label: labels.queueTransfers, value: formatted.transfers, raw: summary.queues.transfers_pending },
    { key: "classes", label: labels.queueClasses, value: formatted.classValidations, raw: summary.queues.class_validations_pending },
    { key: "honors", label: labels.queueHonors, value: formatted.honorsReview, raw: summary.queues.honors_review_pending ?? 0 },
    { key: "folders", label: labels.queueFolders, value: formatted.annualFolders, raw: summary.queues.annual_folders_pending_union },
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
      className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3"
    >
      <OperationsBentoTile
        className="xl:col-span-2"
        title={labels.reportsTitle}
        description={labels.reportsDescription}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
          <OperationsStatRow label={labels.chartSubmitted} value={formatted.submitted} />
          <OperationsStatRow label={labels.chartDraft} value={formatted.draft} />
          <OperationsStatRow label={labels.chartGenerated} value={formatted.generated} />
          <OperationsStatRow
            label={labels.chartMissing}
            value={formatted.missing}
            tone={summary.monthly_reports.missing_sections > 0 ? "warning" : "default"}
          />
        </div>
        <BentoBarChart
          items={reportBars}
          highlightKey={summary.monthly_reports.missing_sections > 0 ? "missing" : "submitted"}
        />
      </OperationsBentoTile>

      <OperationsBentoTile title={labels.queuesTitle} description={labels.queuesDescription}>
        <ul className="space-y-1.5">
          {queueRows.map((row) => (
            <li key={row.key}>
              <OperationsStatRow
                label={row.label}
                value={row.value}
                tone={row.raw > 0 ? "warning" : "default"}
              />
            </li>
          ))}
        </ul>
      </OperationsBentoTile>

      <OperationsBentoTile title={labels.peopleTitle} description={labels.peopleDescription}>
        <BentoSplitBar
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
        <div className="space-y-1.5">
          <OperationsStatRow label={labels.peoplePlatformActive} value={formatted.platformActive} />
          <OperationsStatRow
            label={labels.peoplePlatformInactive}
            value={formatted.platformInactive}
            tone={summary.people.platform_accounts.inactive > 0 ? "warning" : "default"}
          />
        </div>
      </OperationsBentoTile>

      <OperationsBentoTile
        className="xl:col-span-2"
        title={labels.formationTitle}
        description={labels.formationDescription}
      >
        <ClassEnrollmentsChart items={classItems} compact showTable={false} />
      </OperationsBentoTile>

      <OperationsBentoTile title={labels.honorsTitle}>
        {honorsUnavailable ? (
          <p className="text-muted-foreground text-sm">{labels.honorsUnavailable}</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <OperationsStatRow label={labels.honorsInProgress} value={formatted.honorsInProgress} />
              <OperationsStatRow label={labels.honorsPending} value={formatted.honorsPending} />
              <OperationsStatRow label={labels.honorsApproved} value={formatted.honorsApproved} />
            </div>
            <BentoDonut segments={honorsSegments} />
          </>
        )}
      </OperationsBentoTile>

      <OperationsBentoTile
        className="xl:col-span-2"
        title={labels.activitiesTitle}
        description={labels.activitiesDescription}
      >
        <div className="grid grid-cols-3 gap-3">
          <OperationsStatRow label={labels.chartRegistered} value={formatted.activitiesRegistered} />
          <OperationsStatRow label={labels.activitiesJoint} value={formatted.activitiesJoint} />
          <OperationsStatRow label={labels.activitiesSections} value={formatted.activitiesSections} />
        </div>
        <BentoBarChart items={activityBars} highlightKey="registered" />
      </OperationsBentoTile>
    </div>
  );
}
