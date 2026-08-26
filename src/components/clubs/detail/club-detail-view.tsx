"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, FileText, Flag, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { ClubDetailHero } from "@/components/clubs/detail/hero";
import { GeneralTab } from "@/components/clubs/detail/general-tab";
import { HistoryTab } from "@/components/clubs/detail/history-tab";
import { clubLocationName } from "@/components/clubs/detail/location";
import { ReportsTab } from "@/components/clubs/detail/reports-tab";
import { RolesTab } from "@/components/clubs/detail/roles-tab";
import { SectionsTab } from "@/components/clubs/detail/sections-tab";
import {
  CLUB_DETAIL_TABS,
  resolveClubDetailTab,
} from "@/components/clubs/detail/tab-utils";
import { UserDetailActionSidebar } from "@/components/users/detail/action-sidebar";
import { UserDetailStats, type StatItem } from "@/components/users/detail/stats";
import type { AnnualReport, QuarterlyReport } from "@/lib/api/reports";
import type { ClubDetailPayload, ClubDetailTab } from "@/lib/clubs/types";

interface ClubDetailViewProps {
  data: ClubDetailPayload;
  annualReports: AnnualReport[];
  quarterlyReports: QuarterlyReport[];
  defaultTab: ClubDetailTab;
}

export function ClubDetailView({
  data,
  annualReports,
  quarterlyReports,
  defaultTab,
}: ClubDetailViewProps) {
  const t = useTranslations("clubs.detail");
  const tGeneral = useTranslations("clubs.detail.general");
  const tList = useTranslations("clubs.pages.list");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = resolveClubDetailTab(searchParams.get("tab") ?? defaultTab);

  const clubName = data.club.name ?? t("fallbackTitle");
  const isActive = data.club.active !== false;
  const localField = clubLocationName(data.club.local_field, data.club.local_fields);
  const district = clubLocationName(data.club.district, data.club.districts);
  const church = clubLocationName(data.club.church, data.club.churches);
  const address = data.club.address?.trim() || undefined;
  const sectionNames = data.sectionMemberGroups.map((group) => group.sectionName);
  const membersTotal = data.sectionMemberGroups.reduce(
    (total, group) => total + group.members.length,
    0,
  );
  const sectionsCount = data.sectionMemberGroups.length;
  const soulsTotal = data.sectionMemberGroups.reduce<number | null>((total, group) => {
    if (group.soulsTarget == null) return total;
    return (total ?? 0) + group.soulsTarget;
  }, null);
  const reportsCount = annualReports.length + quarterlyReports.length;

  const statItems: StatItem[] = [
    {
      label: t("stats.membersLabel"),
      value: membersTotal,
      sub: t("stats.membersSub", { count: membersTotal }),
      accent: (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5 text-primary" />
          {tGeneral("membersCount", { count: membersTotal })}
        </div>
      ),
    },
    {
      label: t("stats.sectionsLabel"),
      value: sectionsCount,
      sub:
        sectionsCount === 0
          ? t("stats.sectionsEmpty")
          : t("stats.sectionsRegistered", { count: sectionsCount }),
      accent: (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          {localField ?? t("sidebar.dash")}
        </div>
      ),
    },
    {
      label: t("stats.soulsLabel"),
      value: soulsTotal ?? t("sidebar.dash"),
      sub: t("stats.soulsSub"),
      accent: (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Flag className="size-3.5 text-primary" />
          {tGeneral("labelSoulsTarget")}
        </div>
      ),
    },
    {
      label: t("stats.reportsLabel"),
      value: reportsCount,
      sub:
        reportsCount === 0
          ? t("stats.reportsEmpty")
          : t("stats.reportsSub", { count: reportsCount }),
      accent: (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="size-3.5" />
          {t("tabs.reports")}
        </div>
      ),
    },
  ];

  function handleTabChange(nextTab: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "general") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("fallbackTitle")}
        description={t("description")}
        breadcrumbs={[
          { label: tList("title"), href: "/dashboard/clubs" },
          { label: clubName },
        ]}
      />

      <ClubDetailHero
        name={clubName}
        isActive={isActive}
        localField={localField}
        district={district}
        church={church}
        address={address}
        sectionNames={sectionNames}
        backHref="/dashboard/clubs"
        backLabel={t("back")}
        statusActiveLabel={tGeneral("statusActive")}
        statusInactiveLabel={tGeneral("statusInactive")}
        metaLabels={{
          status: tGeneral("labelStatus"),
          localField: tGeneral("labelLocalField"),
          district: tGeneral("labelDistrict"),
          church: tGeneral("labelChurch"),
          section: t("roles.sectionLabel"),
        }}
      />

      <UserDetailStats items={statItems} />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full min-w-0">
        <TabsList className="h-auto min-h-8 w-full flex-wrap">
          {CLUB_DETAIL_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4 grid items-start gap-5 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <TabsContent value="general" className="mt-0">
              <GeneralTab data={data} />
            </TabsContent>
            <TabsContent value="sections" className="mt-0">
              <SectionsTab data={data} />
            </TabsContent>
            <TabsContent value="roles" className="mt-0">
              <RolesTab data={data} />
            </TabsContent>
            <TabsContent value="reports" className="mt-0">
              <ReportsTab
                annualReports={annualReports}
                quarterlyReports={quarterlyReports}
              />
            </TabsContent>
            <TabsContent value="history" className="mt-0">
              <HistoryTab clubId={data.clubId} sections={data.sectionMemberGroups} />
            </TabsContent>
          </div>

          <aside className="hidden lg:block">
            <UserDetailActionSidebar
              title={t("sidebar.title")}
              sections={[
                {
                  items: [
                    <SidebarRow
                      key="status"
                      label={tGeneral("labelStatus")}
                      value={isActive ? tGeneral("statusActive") : tGeneral("statusInactive")}
                    />,
                    <SidebarRow
                      key="members"
                      label={t("stats.membersLabel")}
                      value={membersTotal}
                    />,
                    <SidebarRow
                      key="sections"
                      label={t("stats.sectionsLabel")}
                      value={sectionsCount}
                    />,
                    <SidebarRow
                      key="localField"
                      label={tGeneral("labelLocalField")}
                      value={localField ?? t("sidebar.dash")}
                    />,
                    <SidebarRow
                      key="district"
                      label={tGeneral("labelDistrict")}
                      value={district ?? t("sidebar.dash")}
                    />,
                    <SidebarRow
                      key="church"
                      label={tGeneral("labelChurch")}
                      value={church ?? t("sidebar.dash")}
                    />,
                    <SidebarRow
                      key="address"
                      label={tGeneral("labelAddress")}
                      value={address ?? t("sidebar.dash")}
                    />,
                  ],
                },
                {
                  items: [
                    <Button
                      key="back"
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Link href="/dashboard/clubs">
                        <ArrowLeft className="size-4" />
                        {t("back")}
                      </Link>
                    </Button>,
                  ],
                },
              ]}
            />
          </aside>
        </div>
      </Tabs>
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-border/70 pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
