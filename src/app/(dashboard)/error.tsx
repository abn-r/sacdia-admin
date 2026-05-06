"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Algo salió mal"
        description="Ocurrió un error al cargar esta sección."
      />

      <div
        role="alert"
        aria-live="polite"
        className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No se pudo cargar la página</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          El error fue reportado automáticamente. Podés reintentar o volver al
          dashboard.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">
            ID: {error.digest}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={reset} variant="default" size="sm">
            <RotateCcw className="mr-1.5 size-4" aria-hidden="true" />
            Reintentar
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard">Ir al dashboard</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
