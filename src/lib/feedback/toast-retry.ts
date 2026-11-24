"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export type ToastErrorOptions = {
  title: string;
  description?: string;
  /** When present the toast shows a retry action that calls it. */
  onRetry?: () => void;
  /** Label of the retry action (translated by the caller). */
  retryLabel?: string;
};

/** Error toast with an optional retry action. Prefer `useToastError` in components. */
export function toastError({ title, description, onRetry, retryLabel }: ToastErrorOptions) {
  return toast.error(title, {
    ...(description ? { description } : {}),
    ...(onRetry && retryLabel
      ? { action: { label: retryLabel, onClick: () => onRetry() } }
      : {}),
  });
}

/** Returns `toastError` with the retry label translated (`shared.kit.toast.retry`). */
export function useToastError() {
  const t = useTranslations("shared.kit.toast");
  const retryLabel = t("retry");
  return useCallback(
    (options: Omit<ToastErrorOptions, "retryLabel">) =>
      toastError({ ...options, retryLabel }),
    [retryLabel],
  );
}
