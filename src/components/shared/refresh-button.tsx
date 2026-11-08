"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Re-runs the server render of the current route. For error blocks on server pages. */
export function RefreshButton({ className }: { className?: string }) {
  const t = useTranslations("shared.errorBanner");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      className={className ?? "mt-2"}
      loading={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {t("retry")}
    </Button>
  );
}
