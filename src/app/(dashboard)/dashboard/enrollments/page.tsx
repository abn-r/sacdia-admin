import { Suspense } from "react";
import { ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EnrollmentsTable } from "@/components/enrollments/enrollments-table";
import { listEnrollments, type EnrollmentsQuery } from "@/lib/api/enrollments";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseSearchParams(raw: Record<string, string | string[] | undefined>): EnrollmentsQuery {
  const getString = (key: string) => {
    const v = raw[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  };
  const getNumber = (key: string) => {
    const v = getString(key);
    return v ? Number(v) : undefined;
  };

  return {
    search: getString("search"),
    ecclesiastical_year_id: getNumber("year"),
    page: getNumber("page") ?? 1,
    limit: getNumber("limit") ?? 20,
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function EnrollmentsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-xs" />
      </div>
      <div className="rounded-md border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b p-4 last:border-b-0"
          >
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

async function EnrollmentsContent({ query }: { query: EnrollmentsQuery }) {
  const result = await listEnrollments(query);

  if (!result.endpointAvailable) {
    return (
      <div className="space-y-4">
        <EndpointErrorBanner
          state={result.endpointState as "forbidden" | "missing" | "rate-limited"}
          detail={result.endpointDetail}
          showLoginLink={result.endpointState === "forbidden"}
        />
        <EmptyState
          icon={ClipboardList}
          title="No se pueden mostrar inscripciones"
          description={result.endpointDetail}
        />
      </div>
    );
  }

  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No hay inscripciones pendientes"
        description="No existen inscripciones enviadas para validacion de investidura en este momento."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{result.items.length}</span>{" "}
        {result.items.length === 1
          ? "inscripcion pendiente de validacion"
          : "inscripciones pendientes de validacion"}
      </p>

      <EnrollmentsTable enrollments={result.items} />
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function EnrollmentsFilters({ defaultSearch }: { defaultSearch?: string }) {
  return (
    <form className="flex flex-wrap gap-3" method="GET">
      <Input
        name="search"
        placeholder="Buscar por nombre o email..."
        defaultValue={defaultSearch}
        className="h-9 max-w-xs"
      />
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminUser();
  const rawParams = await searchParams;
  const query = parseSearchParams(rawParams);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inscripciones"
        description="Inscripciones enviadas para validacion de investidura. Aprueba o rechaza cada solicitud."
      />

      <Suspense fallback={<EnrollmentsListSkeleton />}>
        <div className="space-y-4">
          <EnrollmentsFilters defaultSearch={query.search} />
          <EnrollmentsContent query={query} />
        </div>
      </Suspense>
    </div>
  );
}
