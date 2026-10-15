"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("shared.notFound");
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <Button variant="outline" className="mt-4" asChild>
        <Link prefetch={false} replace href="/dashboard">
          {t("backHome")}
        </Link>
      </Button>
    </div>
  );
}
