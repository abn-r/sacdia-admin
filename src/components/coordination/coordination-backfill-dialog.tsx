"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  backfillCoordinatorAssignments,
  type CoordinatorBackfillResult,
  type CoordinatorBackfillSkipReason,
} from "@/lib/api/coordination";
import { formatCoordinatorName } from "@/components/coordination/coordination-labels";

type CoordinationBackfillDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localFieldId: number;
  onApplied: () => Promise<void>;
};

/**
 * "Migrar coordinadores": a dry run first (what it creates, whom it skips and
 * why) and only then the real run.
 */
export function CoordinationBackfillDialog({
  open,
  onOpenChange,
  localFieldId,
  onApplied,
}: CoordinationBackfillDialogProps) {
  const t = useTranslations("coordinationAdmin");
  const tc = useTranslations("people.community.coordination");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<CoordinatorBackfillResult | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const requestId = useRef(0);

  const skipReasonLabels: Record<CoordinatorBackfillSkipReason, string> = {
    already_has_general: t("backfill.reasons.alreadyHasGeneral"),
    already_assigned: t("backfill.reasons.alreadyAssigned"),
    director_conflict: t("backfill.reasons.directorConflict"),
    general_slot_taken: t("backfill.reasons.generalSlotTaken"),
  };

  const loadPreview = useCallback(async () => {
    const id = ++requestId.current;
    setStatus("loading");
    setPreview(null);
    setApplyError(null);
    try {
      const result = await backfillCoordinatorAssignments(localFieldId, true);
      if (id !== requestId.current) return;
      setPreview(result);
      setStatus("ready");
    } catch {
      if (id !== requestId.current) return;
      setStatus("error");
    }
  }, [localFieldId]);

  useEffect(() => {
    if (open) void loadPreview();
    else requestId.current += 1;
  }, [open, loadPreview]);

  async function applyBackfill() {
    setApplying(true);
    setApplyError(null);
    try {
      const result = await backfillCoordinatorAssignments(localFieldId, false);
      toast.success(
        result.created.length > 0
          ? t("backfill.applied", { count: result.created.length })
          : t("backfill.nothingToApply"),
      );
      onOpenChange(false);
      await onApplied();
    } catch (error) {
      setApplyError(getActionErrorMessage(error, t("errors.generic")));
    } finally {
      setApplying(false);
    }
  }

  const canApply = Boolean(preview && preview.created.length > 0);

  return (
    <Dialog open={open} onOpenChange={(next) => (applying ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tc("backfill.title")}</DialogTitle>
          <DialogDescription>{t("backfill.description")}</DialogDescription>
        </DialogHeader>

        {status === "loading" ? (
          <div className="space-y-2" role="status" aria-busy="true">
            <span className="sr-only">{t("backfill.loading")}</span>
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        ) : null}

        {status === "error" ? (
          <ErrorState
            variant="inline"
            title={tc("backfill.loadError")}
            onRetry={() => void loadPreview()}
          />
        ) : null}

        {status === "ready" && preview ? (
          <div className="space-y-4 text-sm">
            {preview.existing_general ? (
              <p className="text-muted-foreground">{t("backfill.existingGeneral")}</p>
            ) : null}

            <div className="flex flex-col gap-0.5 rounded-lg bg-muted px-3.5 py-3">
              <p className="font-medium text-foreground">
                {tc("backfill.willCreate", { count: preview.created.length })}
              </p>
              {preview.created.length === 0 ? (
                <p className="text-muted-foreground">{t("backfill.noneEligible")}</p>
              ) : (
                preview.created.map((person) => (
                  <p key={person.user_id} className="text-muted-foreground">
                    {formatCoordinatorName(person)} · {person.role_name}
                  </p>
                ))
              )}
            </div>

            {preview.skipped.length > 0 ? (
              <div className="space-y-2">
                <p className="font-medium text-foreground">
                  {tc("backfill.skippedHeading", { count: preview.skipped.length })}
                </p>
                <ul className="divide-y rounded-xl border bg-card">
                  {preview.skipped.map((person) => (
                    <li
                      key={`${person.user_id}-${person.reason}`}
                      className="flex flex-col px-4 py-2.5"
                    >
                      <span className="text-foreground">{formatCoordinatorName(person)}</span>
                      <span className="text-[13px] text-muted-foreground">
                        {skipReasonLabels[person.reason]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {applyError ? (
              <p role="alert" className="text-destructive">
                {applyError}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={applying}
            onClick={() => onOpenChange(false)}
          >
            {tc("actions.cancel")}
          </Button>
          <Button
            type="button"
            loading={applying}
            disabled={!canApply || status !== "ready"}
            onClick={() => void applyBackfill()}
          >
            {t("actions.createAssignment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
