import { Suspense } from "react";
import { Scale } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { WeightsClientPage } from "./_components/weights-client-page";
import { listMemberRankingWeights } from "@/lib/api/member-ranking-weights";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function WeightsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Default card skeleton */}
      <Skeleton className="h-28 w-full rounded-xl" />
      {/* Overrides section skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="rounded-xl border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b p-4 last:border-b-0"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="ml-auto h-7 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

async function WeightsContent() {
  const [weightsResult, clubTypes, ecclesiasticalYears] = await Promise.all([
    listMemberRankingWeights({ limit: 100 }),
    listClubTypes().catch(() => [] as Awaited<ReturnType<typeof listClubTypes>>),
    listEcclesiasticalYears().catch(
      () => [] as Awaited<ReturnType<typeof listEcclesiasticalYears>>,
    ),
  ]);

  if (!weightsResult.endpointAvailable) {
    return (
      <EmptyState
        icon={Scale}
        title="No se pueden mostrar los pesos de ranking"
        description={weightsResult.endpointDetail}
      />
    );
  }

  return (
    <WeightsClientPage
      initialData={weightsResult.items}
      clubTypes={clubTypes}
      ecclesiasticalYears={ecclesiasticalYears}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MemberRankingWeightsPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pesos de ranking"
        description="Configura los porcentajes de clase, investidura y campaña usados para calcular el composite score de cada miembro."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Pesos de ranking" },
        ]}
      />

      <Suspense fallback={<WeightsSkeleton />}>
        <WeightsContent />
      </Suspense>
    </div>
  );
}
