"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  const t = useTranslations("shared.errors");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboardTitle")}
        description={t("dashboardDescription")}
      />

      <div
        role="alert"
        aria-live="polite"
        className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{t("dashboardHeading")}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {t("dashboardBody")}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">
            ID: {error.digest}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={reset} variant="default" size="sm">
            <RotateCcw className="mr-1.5 size-4" aria-hidden="true" />
            {t("dashboardRetry")}
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard">{t("dashboardGoHome")}</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
