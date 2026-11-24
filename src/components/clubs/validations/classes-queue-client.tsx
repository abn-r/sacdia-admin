"use client";

import { useTranslations } from "next-intl";
import { HonorInstructorProposalsQueue } from "@/components/honor-instructor-proposals/honor-instructor-proposals-queue";
import { useHonorInstructorProposals } from "@/components/honor-instructor-proposals/use-honor-instructor-proposals";
import { PageHeader } from "@/components/shared/page-header";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import type { PaginatedEvidenceItems } from "@/lib/api/evidence-review";
import type { PendingValidation } from "@/lib/api/validation";
import { EvidenceInboxTab } from "./evidence-inbox-tab";
import type { Loaded } from "./loaded";
import { PendingHonorsTab } from "./pending-honors-tab";
import type { ClassesTab, EvidenceTypeFilter } from "./validation-tabs";

interface ClassesQueueClientProps {
  /** Tabs the user can see, in display order; the first is the default. */
  tabs: ClassesTab[];
  canProposals: boolean;
  pending: Loaded<PendingValidation[]> | null;
  evidence: Loaded<PaginatedEvidenceItems> | null;
  /** Real total of the evidence queue (all types), `undefined` when it could not be loaded. */
  evidenceTotal: number | undefined;
  typeFilter: EvidenceTypeFilter;
}

export function ClassesQueueClient({
  tabs,
  canProposals,
  pending,
  evidence,
  evidenceTotal,
  typeFilter,
}: ClassesQueueClientProps) {
  const t = useTranslations("queues.classes");
  const defaultTab: ClassesTab = tabs[0] ?? "pending";
  const requested = useUrlTab("tab", defaultTab);
  const active = (tabs as string[]).includes(requested) ? (requested as ClassesTab) : defaultTab;

  const proposals = useHonorInstructorProposals(
    { status: "PENDING", page: 1, limit: 20 },
    { enabled: canProposals },
  );

  const counts = {
    pending: pending?.ok ? pending.data.length : undefined,
    evidence: evidenceTotal,
    instructors: canProposals && proposals.data ? proposals.data.total : undefined,
  };

  const summary = [
    counts.pending !== undefined ? t("summary.pending", { count: counts.pending }) : null,
    counts.evidence !== undefined ? t("summary.evidence", { count: counts.evidence }) : null,
    counts.instructors !== undefined ? t("summary.instructors", { count: counts.instructors }) : null,
  ].filter((part): part is string => part !== null);

  const labels: Record<ClassesTab, string> = {
    pending: t("tabs.pending"),
    evidence: t("tabs.evidence"),
    instructors: t("tabs.instructors"),
    history: t("tabs.history"),
  };
  const tabCounts: Record<ClassesTab, number | undefined> = {
    pending: counts.pending,
    evidence: counts.evidence,
    instructors: counts.instructors,
    history: undefined,
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={summary.length > 0 ? summary.join(" · ") : t("description")} />

      <UrlTabs
        ariaLabel={t("tabsLabel")}
        defaultValue={defaultTab}
        tabs={tabs.map((value) => {
          const count = tabCounts[value];
          return { value, label: labels[value], ...(count !== undefined ? { count } : {}) };
        })}
      />

      {active === "pending" && pending && <PendingHonorsTab result={pending} />}
      {active === "evidence" && evidence && (
        <EvidenceInboxTab key={typeFilter} result={evidence} typeFilter={typeFilter} />
      )}
      {active === "instructors" && <HonorInstructorProposalsQueue mode="pending" />}
      {active === "history" && (
        <div className="space-y-4">
          <p className="max-w-prose text-muted-foreground text-sm">{t("history.note")}</p>
          <HonorInstructorProposalsQueue mode="history" />
        </div>
      )}
    </div>
  );
}
