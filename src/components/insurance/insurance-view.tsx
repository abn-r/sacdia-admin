"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiStrip, KpiStripItem } from "@/components/shared/kpi-strip";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import { InsuranceTable } from "@/components/insurance/insurance-table";
import type { SectionInsuranceOverview } from "@/lib/api/insurance";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { useFormatCurrency, useFormatDate } from "@/lib/format-locale";
import {
  INSURANCE_TAB_DEFAULT,
  groupInsurancePeople,
  parseInsuranceTab,
} from "@/lib/insurance/tabs";

interface InsuranceViewProps {
  overview: SectionInsuranceOverview;
}

/** Cycle line, a KpiStrip of 4 and the people split by what there is to do. */
export function InsuranceView({ overview }: InsuranceViewProps) {
  const t = useTranslations("insurance");
  const tc = useTranslations("ops.club.insurance");
  const { canViewScreen } = useScreenAccess();
  const formatDate = useFormatDate();
  const formatCurrency = useFormatCurrency();
  const tab = parseInsuranceTab(useUrlTab("tab", INSURANCE_TAB_DEFAULT));

  if (!overview.year) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t("view.no_year_title")}
        description={t("view.no_year_description")}
      />
    );
  }
  if (!overview.cycle) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t("view.no_cycle_title")}
        description={t("view.no_cycle_description", { year: overview.year.label })}
      />
    );
  }

  const { cycle, year, counts } = overview;
  const groups = groupInsurancePeople(overview.people);
  const deadline = (() => {
    try {
      return formatDate(cycle.purchase_deadline, { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return cycle.purchase_deadline;
    }
  })();

  return (
    <div className="space-y-5">
      <p className="text-sm tabular-nums text-muted-foreground">
        {tc("cycleLine", {
          year: year.label,
          cost: formatCurrency(Number(cycle.unit_cost), cycle.currency),
          deadline,
        })}
      </p>

      <KpiStrip aria-label={tc("summaryLabel")}>
        <KpiStripItem
          label={t("summary.uninsured")}
          value={counts.uninsured}
          emphasis
        />
        <KpiStripItem label={t("summary.in_process")} value={counts.in_process} />
        <KpiStripItem
          label={t("summary.covered")}
          value={t("summary.covered_of_total", { covered: counts.covered, total: counts.total })}
        />
        <KpiStripItem
          label={t("summary.free_coverages")}
          value={overview.free_coverages_count}
          subline={t("summary.free_coverages_hint")}
        />
      </KpiStrip>

      <div className="space-y-4">
        <UrlTabs
          defaultValue={INSURANCE_TAB_DEFAULT}
          ariaLabel={tc("tabsLabel")}
          tabs={[
            { value: "uninsured", label: t("summary.uninsured"), count: groups.uninsured.length },
            { value: "in_process", label: t("summary.in_process"), count: groups.in_process.length },
            { value: "covered", label: t("summary.covered"), count: groups.covered.length },
          ]}
        />
        <InsuranceTable
          people={groups[tab]}
          tab={tab}
          canOpenPaymentOrders={canViewScreen("payment-orders")}
        />
      </div>
    </div>
  );
}
