"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  backfillCoordinatorAssignments,
  type CoordinatorBackfillResult,
  type CoordinatorBackfillSkipReason,
} from "@/lib/api/coordination";
import { formatCoordinatorName } from "@/components/coordination/coordination-labels";

type CoordinationBackfillDialogProps = {
  localFieldId: number;
  onApplied: () => Promise<void>;
};

export function CoordinationBackfillDialog({
  localFieldId,
  onApplied,
}: CoordinationBackfillDialogProps) {
  const t = useTranslations("coordinationAdmin");
  const skipReasonLabels: Record<CoordinatorBackfillSkipReason, string> = {
    already_has_general: t("backfill.reasons.alreadyHasGeneral"),
    already_assigned: t("backfill.reasons.alreadyAssigned"),
    director_conflict: t("backfill.reasons.directorConflict"),
    general_slot_taken: t("backfill.reasons.generalSlotTaken"),
  };
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<CoordinatorBackfillResult | null>(
    null,
  );

  async function openPreview() {
    setOpen(true);
    setLoading(true);
    setPreview(null);
    try {
      const result = await backfillCoordinatorAssignments(localFieldId, true);
      setPreview(result);
    } catch (error) {
      toast.error(getActionErrorMessage(error, t("errors.generic")));
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function applyBackfill() {
    setApplying(true);
    try {
      const result = await backfillCoordinatorAssignments(localFieldId, false);
      setPreview(result);
      if (result.created.length > 0) {
        toast.success(t("backfill.applied", { count: result.created.length }));
      } else {
        toast.success(t("backfill.nothingToApply"));
      }
      await onApplied();
      setOpen(false);
    } catch (error) {
      toast.error(getActionErrorMessage(error, t("errors.generic")));
    } finally {
      setApplying(false);
    }
  }

  const canApply = Boolean(preview && preview.created.length > 0);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => void openPreview()}>
        {t("backfill.action")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("backfill.title")}</DialogTitle>
            <DialogDescription>{t("backfill.description")}</DialogDescription>
          </DialogHeader>

          {loading || !preview ? (
            <p className="text-muted-foreground text-sm">{t("backfill.loading")}</p>
          ) : (
            <div className="space-y-4 text-sm">
              {preview.existing_general ? (
                <p className="text-muted-foreground">
                  {t("backfill.existingGeneral")}
                </p>
              ) : null}

              <div>
                <p className="font-medium text-foreground">
                  {t("backfill.willCreate", { count: preview.created.length })}
                </p>
                {preview.created.length === 0 ? (
                  <p className="text-muted-foreground">
                    {t("backfill.noneEligible")}
                  </p>
                ) : (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {preview.created.map((person) => (
                      <li key={person.user_id}>
                        {formatCoordinatorName(person)} ({person.role_name})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {preview.skipped.length > 0 ? (
                <div>
                  <p className="font-medium text-foreground">
                    {t("backfill.skipped", { count: preview.skipped.length })}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {preview.skipped.map((person) => (
                      <li key={`${person.user_id}-${person.reason}`}>
                        {formatCoordinatorName(person)} —{" "}
                        {skipReasonLabels[person.reason]}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("backfill.cancel")}
            </Button>
            <Button
              disabled={!canApply || applying || loading}
              onClick={() => void applyBackfill()}
            >
              {t("backfill.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
