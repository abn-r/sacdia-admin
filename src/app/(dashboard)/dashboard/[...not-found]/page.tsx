"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { openGlobalSearch } from "@/lib/search/open-search";

export default function DashboardNotFound() {
  const t = useTranslations("shared.shell.errors");
  return (
    <ErrorState
      kind="notFound"
      title={t("notFoundTitle")}
      description={t("notFoundDescription")}
      className="min-h-[60vh] justify-center"
      actions={
        <>
          <Button type="button" onClick={openGlobalSearch}>
            <Search aria-hidden />
            {t("search")}
          </Button>
          <Button variant="outline" asChild>
            <Link prefetch={false} href="/dashboard">
              {t("goHome")}
            </Link>
          </Button>
        </>
      }
    />
  );
}
