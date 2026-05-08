import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("shared.errors");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="size-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold">{t("notFoundTitle")}</h1>
      <p className="max-w-sm text-muted-foreground">{t("notFoundBody")}</p>
      <Button asChild>
        <Link href="/dashboard">{t("notFoundGoHome")}</Link>
      </Button>
    </div>
  );
}
