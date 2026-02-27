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
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";

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

type ClubsResult = {
  items: Club[];
  available: boolean;
  error?: string;
};

async function fetchClubs(): Promise<ClubsResult> {
  try {
    const payload = await apiRequest<unknown>("/clubs");
    let items: Club[] = [];

    if (Array.isArray(payload)) {
      items = payload as Club[];
    } else if (payload && typeof payload === "object") {
      const res = payload as { data?: unknown; status?: string };
      if (Array.isArray(res.data)) {
        items = res.data as Club[];
      }
    }

    return { items, available: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { items: [], available: false, error: error.message };
    }
    return { items: [], available: false, error: "Error inesperado" };
  }
}

async function ClubsContent() {
  const user = await requireAdminUser();
  const canCreate = hasPermission(user, "clubs:create");
  const result = await fetchClubs();

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
    <div className="rounded-md border">
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
    </div>
  );
}

function ClubsSkeleton() {
  return (
    <div className="rounded-md border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </div>
  );
}

export default async function ClubsPage() {
  const user = await requireAdminUser();
  const canCreate = hasPermission(user, "clubs:create");

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
        <ClubsContent />
      </Suspense>
    </div>
  );
}
