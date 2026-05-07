import { Suspense } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Club = {
  club_id?: number;
  id?: number;
  name?: string;
  active?: boolean;
  local_field_id?: number;
  district_id?: number;
  church_id?: number;
  local_field?: { name?: string } | null;
  district?: { name?: string } | null;
  church?: { name?: string } | null;
  [key: string]: unknown;
};

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ClubsResult = {
  items: Club[];
  meta: PaginationMeta;
  available: boolean;
  error?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): { page: number; limit: number } {
  const getString = (key: string) => {
    const v = raw[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  };
  const getPositiveInt = (key: string, fallback: number): number => {
    const v = getString(key);
    if (!v) return fallback;
    const parsed = Number(v);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  };

  return {
    page: getPositiveInt("page", DEFAULT_PAGE),
    limit: getPositiveInt("limit", DEFAULT_LIMIT),
  };
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchClubs(query: {
  page: number;
  limit: number;
}): Promise<ClubsResult> {
  const fallbackMeta: PaginationMeta = {
    page: query.page,
    limit: query.limit,
    total: 0,
    totalPages: 1,
  };

  try {
    const payload = await apiRequest<unknown>(
      `/clubs?page=${query.page}&limit=${query.limit}`,
    );

    // Backend returns PaginatedResult<Club>: { data: Club[], meta: { page, limit, total, totalPages, ... } }
    if (
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload)
    ) {
      const res = payload as {
        data?: unknown;
        meta?: {
          page?: number;
          limit?: number;
          total?: number;
          totalPages?: number;
        };
      };

      if (Array.isArray(res.data)) {
        const items = res.data as Club[];
        const meta: PaginationMeta = {
          page: res.meta?.page ?? query.page,
          limit: res.meta?.limit ?? query.limit,
          total: res.meta?.total ?? items.length,
          totalPages: res.meta?.totalPages ?? 1,
        };
        return { items, meta, available: true };
      }
    }

    // Graceful degradation: backend returned a plain array (no pagination)
    if (Array.isArray(payload)) {
      const items = payload as Club[];
      return {
        items,
        meta: {
          page: 1,
          limit: items.length || query.limit,
          total: items.length,
          totalPages: 1,
        },
        available: true,
      };
    }

    return { items: [], meta: fallbackMeta, available: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { items: [], meta: fallbackMeta, available: false, error: error.message };
    }
    return { items: [], meta: fallbackMeta, available: false, error: "Error inesperado" };
  }
}

// ─── Content ──────────────────────────────────────────────────────────────────

async function ClubsContent({
  query,
}: {
  query: { page: number; limit: number };
}) {
  const user = await requireAdminUser();
  const canCreate = hasPermission(user, "clubs:create");
  const result = await fetchClubs(query);

  if (!result.available) {
    return (
      <div className="space-y-4">
        <EndpointErrorBanner state="missing" detail={result.error ?? "Endpoint no disponible"} />
        <EmptyState icon={Building2} title="No se pueden mostrar clubes" description={result.error} />
      </div>
    );
  }

  if (result.items.length === 0) {
    return (
      <EmptyState icon={Building2} title="No hay clubes registrados" description="Crea el primer club para comenzar.">
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/clubs/new">
              <Plus className="mr-2 size-4" />
              Crear club
            </Link>
          </Button>
        )}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Campo local</TableHead>
              <TableHead className="hidden lg:table-cell">Distrito</TableHead>
              <TableHead className="hidden lg:table-cell">Iglesia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((club) => {
              const clubId = club.club_id ?? club.id;
              return (
                <TableRow key={clubId}>
                  <TableCell className="font-medium">{club.name ?? "—"}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {club.local_field?.name ?? club.local_field_id ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {club.district?.name ?? club.district_id ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {club.church?.name ?? club.church_id ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={club.active !== false ? "default" : "outline"} className="text-xs">
                      {club.active !== false ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/clubs/${clubId}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      <DataTablePagination
        page={result.meta.page}
        totalPages={result.meta.totalPages}
        total={result.meta.total}
        limit={result.meta.limit}
      />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ClubsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const canCreate = hasPermission(user, "clubs:create");
  const rawParams = await searchParams;
  const query = parseSearchParams(rawParams);

  return (
    <div className="space-y-6">
      <PageHeader title="Clubes" description="Gestión de clubes del sistema.">
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/clubs/new">
              <Plus className="mr-2 size-4" />
              Crear club
            </Link>
          </Button>
        )}
      </PageHeader>

      <Suspense fallback={<ClubsSkeleton />}>
        <ClubsContent query={query} />
      </Suspense>
    </div>
  );
}
