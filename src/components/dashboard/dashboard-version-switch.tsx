import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  buildDashboardHref,
  buildDashboardV2Href,
  type OperationsDashboardQuery,
} from "@/lib/api/operations-dashboard";

interface DashboardVersionSwitchProps {
  query: OperationsDashboardQuery;
  active: "v1" | "v2";
}

export async function DashboardVersionSwitch({ query, active }: DashboardVersionSwitchProps) {
  const t = await getTranslations("dashboardHub.operations.version");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant={active === "v1" ? "default" : "outline"} size="sm" asChild>
        <Link href={buildDashboardHref(query)}>{t("v1")}</Link>
      </Button>
      <Button variant={active === "v2" ? "default" : "outline"} size="sm" asChild>
        <Link href={buildDashboardV2Href(query)}>{t("v2")}</Link>
      </Button>
    </div>
  );
}
