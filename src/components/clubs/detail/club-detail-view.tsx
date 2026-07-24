"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { GeneralTab } from "@/components/clubs/detail/general-tab";
import { HistoryTab } from "@/components/clubs/detail/history-tab";
import { ReportsTab } from "@/components/clubs/detail/reports-tab";
import { RolesTab } from "@/components/clubs/detail/roles-tab";
import { SectionsTab } from "@/components/clubs/detail/sections-tab";
import {
  CLUB_DETAIL_TABS,
  resolveClubDetailTab,
} from "@/components/clubs/detail/tab-utils";
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
  const tList = useTranslations("clubs.pages.list");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = resolveClubDetailTab(searchParams.get("tab") ?? defaultTab);

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
    <div className="space-y-6">
      <PageHeader
        title={data.club.name ?? t("fallbackTitle")}
        description={t("description")}
        breadcrumbs={[
          { label: tList("title"), href: "/dashboard/clubs" },
          { label: data.club.name ?? t("fallbackTitle") },
        ]}
      >
        <Badge variant={data.club.active !== false ? "default" : "outline"}>
          {data.club.active !== false ? tList("statusActive") : tList("statusInactive")}
        </Badge>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="h-auto flex-wrap justify-start">
          {CLUB_DETAIL_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralTab data={data} />
        </TabsContent>
        <TabsContent value="sections" className="mt-6">
          <SectionsTab data={data} />
        </TabsContent>
        <TabsContent value="roles" className="mt-6">
          <RolesTab data={data} />
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <ReportsTab
            annualReports={annualReports}
            quarterlyReports={quarterlyReports}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <HistoryTab clubId={data.clubId} sections={data.sectionMemberGroups} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
