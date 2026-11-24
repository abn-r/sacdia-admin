"use client";

import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteActivity } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";
import { formatCalendarDate } from "@/lib/format-locale";

interface DeleteActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
  onSuccess: () => void;
}

/**
 * Deleting deactivates one activity. For a session of a series it says what it
 * removes (this session only) and where the rest of the series is handled.
 */
export function DeleteActivityDialog({ open, onOpenChange, activity, onSuccess }: DeleteActivityDialogProps) {
  const t = useTranslations("people.activities.delete");
  const tOld = useTranslations("activities");
  const locale = useLocale();

  const inSeries = Boolean(activity?.activity_series_id);
  const date = activity?.activity_date ? formatCalendarDate(activity.activity_date, locale, "long") : "";

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="destructive"
      title={inSeries ? t("titleSession", { date }) : t("title", { name: activity?.name ?? "" })}
      description={inSeries ? t("bodySeries") : t("body")}
      confirmLabel={inSeries ? t("confirmSession") : t("confirm")}
      onConfirm={async () => {
        if (!activity) return;
        try {
          await deleteActivity(activity.activity_id);
        } catch (error: unknown) {
          throw new Error(error instanceof Error && error.message ? error.message : tOld("errors.delete_failed"));
        }
        toast.success(tOld("toasts.deleted"));
        onSuccess();
      }}
    />
  );
}
