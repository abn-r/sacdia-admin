"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("shared.shell.errors");
  // Captured once at mount so the "at" time does not change between renders.
  const [at] = useState(() => new Date());

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorState
      title={t("crashTitle")}
      description={t("crashDescription")}
      onRetry={reset}
      detail={{ code: 500, at, ref: error.digest }}
      actions={
        <Button variant="outline" asChild>
          <Link href="/dashboard">{t("goHome")}</Link>
        </Button>
      }
    />
  );
}
