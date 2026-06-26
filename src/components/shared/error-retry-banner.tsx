"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorRetryBannerProps {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function ErrorRetryBanner({
  message,
  onRetry,
  isRetrying = false,
  className,
}: ErrorRetryBannerProps) {
  const t = useTranslations("shared.errorRetry");

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-2.5 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="shrink-0 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <RefreshCw
            className={cn("size-3.5", isRetrying && "animate-spin")}
            aria-hidden="true"
          />
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
