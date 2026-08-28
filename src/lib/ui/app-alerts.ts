"use client";

import { toast } from "sonner";
import { type AppAlertType } from "@/lib/ui/app-alert-params";

type ShowAppAlertInput = {
  type?: AppAlertType;
  title: string;
  description?: string;
};

export function isAppAlertType(value: string | null): value is AppAlertType {
  return (
    value === "success"
    || value === "error"
    || value === "warning"
    || value === "info"
    || value === "neutral"
  );
}

export function showAppAlert({ type = "neutral", title, description }: ShowAppAlertInput) {
  const options = description ? { description } : undefined;

  switch (type) {
    case "success":
      toast.success(title, options);
      return;
    case "error":
      toast.error(title, options);
      return;
    case "warning":
      toast.warning(title, options);
      return;
    case "info":
      toast.info(title, options);
      return;
    default:
      toast(title, options);
  }
}
