import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { requireAdminUser } from "@/lib/auth/session";
import { getMemberRankingWeights } from "@/lib/api/member-ranking-weights";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { ApiError } from "@/lib/api/client";
import { WeightsForm } from "../../_components/weights-form";

const BACK_HREF = "/dashboard/member-ranking-weights";

interface EditWeightsPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWeightsPage({ params }: EditWeightsPageProps) {
  const { id } = await params;

  await requireAdminUser();
  const t = await getTranslations("memberRankingWeights.pages.edit");
  const tList = await getTranslations("memberRankingWeights.pages.list");

  let weightRow;
  let loadError: string | null = null;

  try {
    weightRow = await getMemberRankingWeights(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    loadError = err instanceof ApiError ? err.message : "Error al cargar la configuración";
  }

  const [clubTypes, ecclesiasticalYears] = await Promise.all([
    listClubTypes().catch(() => []),
    listEcclesiasticalYears().catch(() => []),
  ]);

  const isDefault = weightRow?.is_default ?? false;
  const pageTitle = isDefault ? t("titleDefault") : t("titleOverride");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={pageTitle}
        description={t("description")}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: tList("breadcrumbLabel"), href: BACK_HREF },
          { label: isDefault ? t("breadcrumbDefault") : t("breadcrumbOverride") },
        ]}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={BACK_HREF}>
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
      </PageHeader>

      {loadError && (
        <EmptyState
          icon={Scale}
          title={t("cannotLoad")}
          description={loadError}
        />
      )}

      {!loadError && weightRow && (
        <WeightsForm
          mode="edit"
          defaultValues={weightRow}
          clubTypes={clubTypes}
          ecclesiasticalYears={ecclesiasticalYears}
          backHref={BACK_HREF}
        />
      )}
    </div>
  );
}
