"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

// Rendered by the root layout, outside the dashboard shell: the global search
// dialog is only mounted inside the shell, so there is no search action here.
export default function NotFound() {
  const t = useTranslations("shared.shell.errors");
  return (
    <div className="flex h-dvh items-center justify-center px-4">
      <ErrorState
        kind="notFound"
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
        actions={
          <Button asChild>
            <Link prefetch={false} replace href="/dashboard">
              {t("goHome")}
            </Link>
          </Button>
        }
      />
    </div>
  );
}
