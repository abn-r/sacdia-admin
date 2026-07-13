import { PanelDashboardLink } from "@/components/shared/panel-dashboard-link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { WeightsForm } from "../_components/weights-form";

import { toV2Path } from "@/lib/v2/route-map";

const BACK_HREF = "/dashboard/member-ranking-weights";

export default async function NewWeightsPage() {
  await requireAdminUser();
  const t = await getTranslations("memberRankingWeights.pages.new");
  const tList = await getTranslations("memberRankingWeights.pages.list");

  const [clubTypes, ecclesiasticalYears] = await Promise.all([
    listClubTypes().catch(() => []),
    listEcclesiasticalYears().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: "Dashboard", href: toV2Path("/dashboard") },
          { label: tList("breadcrumbLabel"), href: toV2Path(BACK_HREF) },
          { label: t("breadcrumbLabel") },
        ]}
      >
        <Button variant="outline" size="sm" asChild>
          <PanelDashboardLink href={BACK_HREF}>
            <ArrowLeft className="size-4" />
            {t("back")}
          </PanelDashboardLink>
        </Button>
      </PageHeader>

      <WeightsForm
        mode="create"
        clubTypes={clubTypes}
        ecclesiasticalYears={ecclesiasticalYears}
        backHref={BACK_HREF}
      />
    </div>
  );
}
