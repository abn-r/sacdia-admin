"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

/** The club detail failed to render: retry in place, or go back to the club list. */
export default function ClubDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("shared.shell.errors");
  const tList = useTranslations("clubs.pages.list");
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
          <Link href="/dashboard/clubs">{tList("title")}</Link>
        </Button>
      }
    />
  );
}
