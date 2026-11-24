"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SACDIA_DISPLAY_TIMEZONE } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

export interface StaleDataNoticeProps {
  /** When the data on screen was last fetched successfully. */
  at: Date | string | number;
  /** Custom retry handler. Takes precedence over `retry`. */
  onRetry?: () => void;
  /** `true` re-runs the server render with `router.refresh()`. */
  retry?: boolean;
  className?: string;
}

/**
 * Thin warning bar shown above data that is still visible but could not be
 * refreshed ("Mostramos los datos de las 10:42"). Not a blocking error.
 */
export function StaleDataNotice({ at, onRetry, retry, className }: StaleDataNoticeProps) {
  const t = useTranslations("shared.kit.staleData");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const time = format.dateTime(new Date(at), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SACDIA_DISPLAY_TIMEZONE,
  });

  const handleRetry = onRetry
    ? () => onRetry()
    : retry
      ? () => startTransition(() => router.refresh())
      : undefined;

  return (
    <div
      role="status"
      data-slot="stale-data-notice"
      className={cn(
        "mb-3 flex items-center gap-2.5 rounded-[10px] bg-[color-mix(in_oklch,var(--warning)_9%,transparent)] px-3 py-2 text-[13px]",
        className,
      )}
    >
      <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
      <span>{t("message", { time })}</span>
      {handleRetry && (
        <Button
          type="button"
          variant="link"
          size="xs"
          className="ml-auto h-auto p-0 font-medium no-underline hover:underline"
          loading={pending}
          onClick={handleRetry}
        >
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
