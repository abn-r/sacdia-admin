import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import type { PhaseECatalogCrudPageProps } from "@/components/catalogs/phase-e-catalog-crud-page";

const PhaseECatalogCrudPage = dynamic(
  () =>
    import("@/components/catalogs/phase-e-catalog-crud-page").then((m) => ({
      default: m.PhaseECatalogCrudPage,
    })),
  {
    loading: () => (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    ),
  },
);

type V2PhaseECatalogPageProps = PhaseECatalogCrudPageProps & {
  loadError?: string | null;
};

export function V2PhaseECatalogPage({
  loadError,
  title,
  description,
  ...crudProps
}: V2PhaseECatalogPageProps) {
  return (
    <V2PageShell title={title} description={description} bleed>
      {loadError ? <EndpointErrorBanner state="missing" detail={loadError} /> : null}
      <PhaseECatalogCrudPage
        title={title}
        description={description}
        hidePageHeader
        {...crudProps}
      />
    </V2PageShell>
  );
}
