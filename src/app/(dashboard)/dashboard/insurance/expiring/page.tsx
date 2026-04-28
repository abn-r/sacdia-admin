import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import {
  ExpiringDashboard,
  ExpiringDashboardSkeleton,
} from "@/components/insurance/expiring-dashboard";
import { getExpiringInsurance } from "@/lib/api/insurance";
import { requireAdminUser } from "@/lib/auth/session";
import type { ExpiringInsurance } from "@/lib/api/insurance";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDaysAhead(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = parseInt(value ?? "30", 10);
  const allowed = [7, 15, 30, 60, 90];
  return allowed.includes(parsed) ? parsed : 30;
}

// ─── Data Loader ─────────────────────────────────────────────────────────────

type LoadResult =
  | { ok: true; items: ExpiringInsurance[]; daysAhead: number }
  | { ok: false; error: string; daysAhead: number };

async function loadExpiringInsurances(daysAhead: number): Promise<LoadResult> {
  try {
    const items = await getExpiringInsurance(daysAhead);
    return { ok: true, items, daysAhead };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "No se pudo cargar la lista de seguros por vencer.";
    return { ok: false, error: message, daysAhead };
  }
}

// ─── Content ─────────────────────────────────────────────────────────────────

async function ExpiringContent({
  daysAhead,
}: {
  daysAhead: number;
}) {
  const result = await loadExpiringInsurances(daysAhead);

  if (!result.ok) {
    return (
      <EndpointErrorBanner
        state="missing"
        detail={result.error}
      />
    );
  }

  return (
    <ExpiringDashboard items={result.items} daysAhead={result.daysAhead} />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExpiringInsurancePage({
  searchParams,
}: PageProps) {
  await requireAdminUser();

  const params = await searchParams;
  const daysAhead = parseDaysAhead(params.days_ahead);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seguros por Vencer"
        description="Seguros activos próximos a vencer ordenados por urgencia."
      >
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-1.5">
          <ShieldAlert className="size-4 text-warning" />
          <span className="text-sm font-medium text-warning">
            Ventana: {daysAhead} días
          </span>
        </div>
      </PageHeader>

      <Suspense fallback={<ExpiringDashboardSkeleton />}>
        <ExpiringContent daysAhead={daysAhead} />
      </Suspense>
    </div>
  );
}
