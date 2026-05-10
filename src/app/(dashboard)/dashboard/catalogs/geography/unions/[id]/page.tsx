import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { UnionScoringCategoriesTab } from "@/components/scoring-categories/union-scoring-categories-tab";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ tab?: string }>;

type Union = {
  union_id: number;
  name: string;
  abbreviation?: string | null;
  country_id?: number;
  active?: boolean;
  country?: { name?: string } | null;
  [key: string]: unknown;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-[160px] text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">
        {value ?? <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

const VALID_TABS = ["view", "scoring-categories"] as const;
type ValidTab = (typeof VALID_TABS)[number];

function resolveTab(raw: string | undefined): ValidTab {
  if (raw && (VALID_TABS as readonly string[]).includes(raw)) {
    return raw as ValidTab;
  }
  return "view";
}

export default async function UnionDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const t = await getTranslations("catalogs.pages.unionsDetail");
  await requireAdminUser();

  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const defaultTab = resolveTab(tabParam);
  const unionId = Number(id);

  if (isNaN(unionId)) notFound();

  let union: Union;
  try {
    const payload = await apiRequest<unknown>(`/admin/unions/${unionId}`);
    const res = payload as { data?: Union } | Union;
    union =
      "data" in res && res.data && typeof res.data === "object"
        ? (res.data as Union)
        : (res as Union);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403)
    ) {
      notFound();
    }
    throw error;
  }

  const unionName = union.name ?? `Unión ${unionId}`;

  return (
    <div className="space-y-6">
      <PageHeader title={unionName}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/catalogs/geography/unions">
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
      </PageHeader>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="view">{t("tabInfo")}</TabsTrigger>
          <TabsTrigger value="scoring-categories">
            {t("tabScoringCategories")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("cardTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label={t("labelName")} value={union.name} />
              <InfoRow label={t("labelAbbreviation")} value={union.abbreviation} />
              <InfoRow label={t("labelCountry")} value={union.country?.name ?? union.country_id} />
              <InfoRow
                label={t("labelStatus")}
                value={
                  <Badge
                    variant={union.active !== false ? "success" : "secondary"}
                    className="text-xs"
                  >
                    {union.active !== false ? t("statusActive") : t("statusInactive")}
                  </Badge>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring-categories" className="mt-4">
          <UnionScoringCategoriesTab unionId={unionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
