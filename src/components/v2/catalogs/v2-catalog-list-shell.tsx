import type { ReactNode } from "react";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";

type V2CatalogListShellProps = {
  title: string;
  description?: string;
  loadError?: string | null;
  children: ReactNode;
};

export function V2CatalogListShell({
  title,
  description,
  loadError,
  children,
}: V2CatalogListShellProps) {
  return (
    <V2PageShell title={title} description={description} bleed>
      {loadError ? <EndpointErrorBanner state="missing" detail={loadError} /> : null}
      {children}
    </V2PageShell>
  );
}
