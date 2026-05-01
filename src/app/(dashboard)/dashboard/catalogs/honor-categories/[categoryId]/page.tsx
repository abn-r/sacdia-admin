import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ApiError } from "@/lib/api/client";
import { getHonorCategoryById } from "@/lib/api/honor-categories";
import { listHonors, type Honor } from "@/lib/api/honors";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { HONOR_CATEGORIES_READ } from "@/lib/auth/permissions";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
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

function extractHonors(payload: unknown): Honor[] {
  if (Array.isArray(payload)) return payload as Honor[];
  const root = payload as GenericRecord | null;
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data as Honor[];
  const nested = root.data as GenericRecord | undefined;
  if (nested && Array.isArray(nested.data)) return nested.data as Honor[];
  if (nested && Array.isArray(nested.items)) return nested.items as Honor[];
  return [];
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
  const canRead = roleSet.has(SUPER_ADMIN_ROLE) || hasAnyPermission(user, [HONOR_CATEGORIES_READ]);

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

  // Fetch honors belonging to this category — non-blocking (failure shows empty list)
  let categoryHonors: Honor[] = [];
  try {
    const honorsPayload = await listHonors({ categoryId: parsedCategoryId, limit: 200 });
    categoryHonors = extractHonors(honorsPayload);
  } catch {
    // Silently ignore — honors list is supplemental info
  }

  const categoryPrimaryId =
    toPositiveNumber(category.honor_category_id) ??
    toPositiveNumber(category.category_id) ??
    parsedCategoryId;
  const categoryName = toText(category.name) ?? `Categoría #${categoryPrimaryId}`;
  const description = toText(category.description);
  const honorCount = toNonNegativeNumber(category.honors_count ?? category.honorsCount ?? category.honors_total) ?? categoryHonors.length;

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
          <InfoRow label="Especialidades asociadas" value={honorCount} />
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

      {/* Associated honors — read-only list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Especialidades en esta categoría
            {categoryHonors.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {categoryHonors.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryHonors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No se encontraron especialidades asignadas a esta categoría, o el endpoint no respondió.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">ID</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nombre</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nivel</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryHonors.map((honor) => (
                    <TableRow key={honor.honor_id}>
                      <TableCell className="text-xs text-muted-foreground">{honor.honor_id}</TableCell>
                      <TableCell className="text-sm font-medium">{honor.name ?? honor.title ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{honor.skill_level ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={honor.active !== false ? "success" : "secondary"} className="text-xs">
                          {honor.active !== false ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
