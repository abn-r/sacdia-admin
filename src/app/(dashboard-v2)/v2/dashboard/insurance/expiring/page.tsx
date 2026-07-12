import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import dynamic from "next/dynamic";
import { ExpiringDashboardSkeleton } from "@/components/insurance/expiring-dashboard";

const ExpiringDashboard = dynamic(
  () =>
    import("@/components/insurance/expiring-dashboard").then((m) => ({
      default: m.ExpiringDashboard,
    })),
  { loading: () => <ExpiringDashboardSkeleton /> },
);
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
  | { ok: false; errorMessage: string; daysAhead: number };

async function loadExpiringInsurances(
  daysAhead: number,
  fallbackErrorMessage: string,
): Promise<LoadResult> {
  try {
    const items = await getExpiringInsurance(daysAhead);
    return { ok: true, items, daysAhead };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : fallbackErrorMessage;
    return { ok: false, errorMessage, daysAhead };
  }
}

// ─── Content ─────────────────────────────────────────────────────────────────

async function ExpiringContent({
  daysAhead,
  fallbackErrorMessage,
}: {
  daysAhead: number;
  fallbackErrorMessage: string;
}) {
  const result = await loadExpiringInsurances(daysAhead, fallbackErrorMessage);

  if (!result.ok) {
    return (
      <EndpointErrorBanner
        state="missing"
        detail={result.errorMessage}
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
  const t = await getTranslations("insurance");

  const params = await searchParams;
  const daysAhead = parseDaysAhead(params.days_ahead);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageExpiring.title")}
        description={t("pageExpiring.description")}
      >
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-1.5">
          <ShieldAlert className="size-4 text-warning" />
          <span className="text-sm font-medium text-warning">
            {t("pageExpiring.window_label", { days: daysAhead })}
          </span>
        </div>
      </PageHeader>

      <Suspense fallback={<ExpiringDashboardSkeleton />}>
        <ExpiringContent
          daysAhead={daysAhead}
          fallbackErrorMessage={t("pageExpiring.error_load_failed")}
        />
      </Suspense>
    </div>
  );
}
