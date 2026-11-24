"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailHeader, type DetailHeaderFact } from "@/components/shared/detail-header";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import { clubLocationName } from "@/components/clubs/detail/location";
import { GeneralTab } from "@/components/clubs/detail/general-tab";
import { HistoryTab } from "@/components/clubs/detail/history-tab";
import { MembersTab } from "@/components/clubs/detail/members-tab";
import { ReportsTab } from "@/components/clubs/detail/reports-tab";
import { SectionsTab } from "@/components/clubs/detail/sections-tab";
import type { AnnualReport, QuarterlyReport } from "@/lib/api/reports";
import { summarizeClubFacts } from "@/lib/clubs/detail-members";
import {
  resolveClubDetailTab,
  visibleClubDetailTabs,
  type ClubDetailTabKey,
} from "@/lib/clubs/detail-tabs";
import type { ClubDetailPayload } from "@/lib/clubs/types";

export interface ClubDetailYearLabels {
  /** "2026": the ecclesiastical year in force; null when it cannot be resolved. */
  current: string | null;
  /** "2027": the year the director designation and annual enrollment target. */
  next: string | null;
}

interface ClubDetailViewProps {
  data: ClubDetailPayload;
  annualReports: AnnualReport[];
  quarterlyReports: QuarterlyReport[];
  /** The report list request failed: show an error, not "no reports". */
  annualReportsError?: boolean;
  quarterlyReportsError?: boolean;
  /**
   * Capability reports.view_periodic: coordinators cannot see quarterly /
   * annual reports, so the tab is hidden for them.
   */
  canViewPeriodicReports?: boolean;
  /** reports:read: rows link to the report detail. */
  canOpenReports?: boolean;
  /** clubs:update: shows the "Editar" action in the header. */
  canEdit?: boolean;
  /** clubs:revoke_roles: shows "Quitar cargo" in the sections tab. */
  canRevokeRoles?: boolean;
  yearLabels?: ClubDetailYearLabels;
  defaultTab?: ClubDetailTabKey;
}

function clubInitials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

export function ClubDetailView({
  data,
  annualReports,
  quarterlyReports,
  annualReportsError = false,
  quarterlyReportsError = false,
  canViewPeriodicReports = true,
  canOpenReports = false,
  canEdit = false,
  canRevokeRoles,
  yearLabels = { current: null, next: null },
  defaultTab = "general",
}: ClubDetailViewProps) {
  const t = useTranslations("people.clubDetail");
  const tDetail = useTranslations("clubs.detail");
  const tList = useTranslations("clubs.pages.list");
  const tActions = useTranslations("clubs.pages.v2");

  const requested = resolveClubDetailTab(useUrlTab("tab", defaultTab));
  const visibleTabs = visibleClubDetailTabs(canViewPeriodicReports);
  const activeTab = visibleTabs.includes(requested) ? requested : "general";

  const clubName = data.club.name ?? tDetail("fallbackTitle");
  const isActive = data.club.active !== false;
  const place = [
    clubLocationName(data.club.local_field, data.club.local_fields),
    clubLocationName(data.club.district, data.club.districts),
    clubLocationName(data.club.church, data.club.churches),
  ]
    .filter(Boolean)
    .join(" · ");

  const summary = summarizeClubFacts(data.sectionMemberGroups);
  const facts: DetailHeaderFact[] = [
    { label: t("facts.members"), value: summary.members },
    {
      label: t("facts.sections"),
      value: t("facts.sectionsOf", {
        active: summary.sectionsActive,
        total: data.clubTypes.length || summary.sectionsRegistered,
      }),
    },
    ...(summary.souls != null ? [{ label: t("facts.souls"), value: summary.souls }] : []),
  ];

  const tabLabels: Record<ClubDetailTabKey, string> = {
    general: t("tabs.general"),
    sections: t("tabs.sections"),
    members: t("tabs.members"),
    reports: t("tabs.reports"),
    history: t("tabs.history"),
  };

  const counts: Partial<Record<ClubDetailTabKey, number>> = {
    sections: summary.sectionsRegistered,
    members: summary.members,
  };

  return (
    <div className="space-y-5">
      <DetailHeader
        breadcrumbs={[{ label: tList("title"), href: "/dashboard/clubs" }, { label: clubName }]}
        media={
          <span
            aria-hidden="true"
            className="grid size-14 place-items-center bg-primary-soft font-semibold text-lg text-primary-soft-foreground"
          >
            {clubInitials(clubName)}
          </span>
        }
        title={clubName}
        subtitle={
          place || !isActive ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              {place ? <span>{place}</span> : null}
              <ExceptionStatus<"active" | "inactive">
                value={isActive ? "active" : "inactive"}
                normal={["active"]}
                labels={{ active: t("status.active"), inactive: t("status.inactive") }}
                intents={{ inactive: "neutral" }}
              />
            </span>
          ) : undefined
        }
        facts={facts}
        actions={
          canEdit ? (
            <Button asChild variant="outline" size="sm">
              <Link prefetch={false} href={`/dashboard/clubs/${data.clubId}/edit`}>
                <Pencil aria-hidden="true" />
                {tActions("actionEdit")}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <UrlTabs
        ariaLabel={t("tabsLabel")}
        defaultValue="general"
        tabs={visibleTabs.map((tab) => ({
          value: tab,
          label: tabLabels[tab],
          ...(counts[tab] !== undefined ? { count: counts[tab] } : {}),
        }))}
      />

      <div className="min-w-0">
        {activeTab === "general" ? <GeneralTab data={data} /> : null}
        {activeTab === "sections" ? <SectionsTab data={data} yearLabels={yearLabels} canRevokeRoles={canRevokeRoles} /> : null}
        {activeTab === "members" ? (
          <MembersTab data={data} classYearLabel={yearLabels.current} />
        ) : null}
        {activeTab === "reports" && canViewPeriodicReports ? (
          <ReportsTab
            annualReports={annualReports}
            quarterlyReports={quarterlyReports}
            annualReportsError={annualReportsError}
            quarterlyReportsError={quarterlyReportsError}
            canOpenReports={canOpenReports}
          />
        ) : null}
        {activeTab === "history" ? (
          <HistoryTab clubId={data.clubId} sections={data.sectionMemberGroups} />
        ) : null}
      </div>
    </div>
  );
}
