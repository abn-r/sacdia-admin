"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  const t = useTranslations("shared.notFound");
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <Button variant="outline" className="mt-4" asChild>
        <Link prefetch={false} href="/dashboard">
          {t("backHome")}
        </Link>
      </Button>
    </div>
  );
}
