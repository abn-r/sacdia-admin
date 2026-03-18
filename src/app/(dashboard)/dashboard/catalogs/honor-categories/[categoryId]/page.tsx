import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ApiError } from "@/lib/api/client";
import { getHonorCategoryById } from "@/lib/api/honor-categories";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { HONOR_CATEGORIES_READ } from "@/lib/auth/permissions";
import { extractRoles } from "@/lib/auth/roles";
import { requireAdminUser } from "@/lib/auth/session";

type Params = Promise<{ categoryId: string }>;
type GenericRecord = Record<string, unknown>;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function toNonNegativeNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.floor(parsed);
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePayload(payload: unknown): GenericRecord | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const direct = payload as GenericRecord;
  if (
    typeof direct.honor_category_id !== "undefined" ||
    typeof direct.category_id !== "undefined" ||
    typeof direct.name !== "undefined"
  ) {
    return direct;
  }

  const data = direct.data;
  if (data && typeof data === "object") {
    return data as GenericRecord;
  }

  return direct;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-[170px] text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  );
}

export default async function HonorCategoryDetailPage({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const roleSet = new Set(extractRoles(user));
  const canRead = roleSet.has("super_admin") || hasAnyPermission(user, [HONOR_CATEGORIES_READ]);

  if (!canRead) {
    return (
      <EndpointErrorBanner
        state="forbidden"
        detail="No cuentas con permisos para ver categorías de especialidades."
      />
    );
  }

  const { categoryId } = await params;
  const parsedCategoryId = toPositiveNumber(categoryId);
  if (!parsedCategoryId) {
    notFound();
  }

  let category: GenericRecord;
  try {
    const payload = await getHonorCategoryById(parsedCategoryId);
    const normalized = normalizePayload(payload);
    if (!normalized) {
      notFound();
    }
    category = normalized;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const categoryPrimaryId =
    toPositiveNumber(category.honor_category_id) ??
    toPositiveNumber(category.category_id) ??
    parsedCategoryId;
  const categoryName = toText(category.name) ?? `Categoría #${categoryPrimaryId}`;
  const description = toText(category.description);
  const honorCount = toNonNegativeNumber(category.honors_count ?? category.honorsCount ?? category.honors_total);

  return (
    <div className="space-y-6">
      <PageHeader title="Detalle de categoría de especialidad">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/catalogs/honor-categories">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold">{categoryName}</h2>
            <p className="text-sm text-muted-foreground">Categoría de especialidades</p>
          </div>

          <Badge variant={category.active !== false ? "default" : "outline"} className="w-fit">
            {category.active !== false ? "Activa" : "Inactiva"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="ID" value={categoryPrimaryId} />
          <InfoRow label="Nombre" value={categoryName} />
          <InfoRow label="Especialidades asociadas" value={honorCount ?? "—"} />
          <InfoRow label="Estado" value={category.active !== false ? "Activa" : "Inactiva"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Descripción</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {description ?? "Sin descripción registrada."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
