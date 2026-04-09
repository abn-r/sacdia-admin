import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { LocalFieldScoringCategoriesTab } from "@/components/scoring-categories/local-field-scoring-categories-tab";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ tab?: string }>;

type LocalField = {
  local_field_id: number;
  name: string;
  abbreviation?: string | null;
  union_id?: number;
  active?: boolean;
  union?: { name?: string } | null;
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

export default async function LocalFieldDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdminUser();

  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const defaultTab = resolveTab(tabParam);
  const fieldId = Number(id);

  if (isNaN(fieldId)) notFound();

  let localField: LocalField;
  try {
    const payload = await apiRequest<unknown>(`/admin/local-fields/${fieldId}`);
    const res = payload as { data?: LocalField } | LocalField;
    localField =
      "data" in res && res.data && typeof res.data === "object"
        ? (res.data as LocalField)
        : (res as LocalField);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403)
    ) {
      notFound();
    }
    throw error;
  }

  const fieldName = localField.name ?? `Campo Local ${fieldId}`;

  return (
    <div className="space-y-6">
      <PageHeader title={fieldName}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/catalogs/geography/local-fields">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
      </PageHeader>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="view">Información</TabsTrigger>
          <TabsTrigger value="scoring-categories">
            Categorías de Puntuación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Datos del campo local
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Nombre" value={localField.name} />
              <InfoRow label="Abreviatura" value={localField.abbreviation} />
              <InfoRow
                label="Unión"
                value={localField.union?.name ?? localField.union_id}
              />
              <InfoRow
                label="Estado"
                value={
                  <Badge
                    variant={
                      localField.active !== false ? "success" : "secondary"
                    }
                    className="text-xs"
                  >
                    {localField.active !== false ? "Activo" : "Inactivo"}
                  </Badge>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring-categories" className="mt-4">
          <LocalFieldScoringCategoriesTab fieldId={fieldId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
