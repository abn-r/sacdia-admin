"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import {
  closeCamporeeClubRegistration,
  reopenCamporeeClubRegistration,
} from "@/lib/api/camporees";
import { isClubRegistrationClosed } from "@/lib/camporees/club-registration";

export interface ClubRegistrationActionsProps {
  camporeeId: number;
  isUnion?: boolean;
  closedAt?: string | null;
  canManage: boolean;
  enrolledClubCount: number;
  clubsLoadFailed?: boolean;
  hasScoringArtifacts?: boolean;
  camporeeActive?: boolean;
}

function getApiErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== "object") {
    return null;
  }
  const code = (error.payload as { code?: unknown }).code;
  return typeof code === "string" && code.trim() ? code : null;
}

export function ClubRegistrationActions({
  camporeeId,
  isUnion = false,
  closedAt,
  canManage,
  enrolledClubCount,
  clubsLoadFailed = false,
  hasScoringArtifacts = false,
  camporeeActive = true,
}: ClubRegistrationActionsProps) {
  const t = useTranslations("camporees.clubRegistration");
  const tc = useTranslations("evaluation.camporees.registration");
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reasonId = useId();

  const closed = isClubRegistrationClosed(closedAt);
  const closeBlocked =
    !camporeeActive || (!clubsLoadFailed && enrolledClubCount === 0);
  const reopenBlocked = hasScoringArtifacts;

  if (!canManage) return null;

  async function handleConfirm() {
    try {
      if (closed) {
        await reopenCamporeeClubRegistration(camporeeId, { isUnion });
        toast.success(t("reopenSuccess"));
      } else {
        await closeCamporeeClubRegistration(camporeeId, { isUnion });
        toast.success(t("closeSuccess"));
      }
    } catch (error: unknown) {
      // ConfirmDialog keeps itself open and shows this message inline.
      throw new Error(resolveErrorMessage(error, closed, t));
    }
    router.refresh();
  }

  const disabledReason = closed
    ? reopenBlocked
      ? t("reopenBlockedHint")
      : undefined
    : !camporeeActive
      ? t("inactiveHint")
      : closeBlocked
        ? t("noClubsHint")
        : undefined;

  return (
    <>
      {/*
        The reason is visible text, not a `title`: disabled buttons don't fire
        hover events and `title` never shows on touch or keyboard.
      */}
      <div className="flex max-w-xs flex-col items-start gap-1 sm:items-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={Boolean(disabledReason)}
          aria-describedby={disabledReason ? reasonId : undefined}
          data-testid={closed ? "club-registration-reopen" : "club-registration-close"}
        >
          {closed ? (
            <LockOpen className="mr-2 size-3.5" />
          ) : (
            <Lock className="mr-2 size-3.5" />
          )}
          {closed ? t("reopenButton") : `${t("closeButton")}…`}
        </Button>
        {disabledReason && (
          <p
            id={reasonId}
            data-testid="club-registration-disabled-reason"
            className="text-xs text-muted-foreground sm:text-right"
          >
            {disabledReason}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={closed ? t("reopenTitle") : t("closeTitle")}
        description={
          closed
            ? t("reopenDescription")
            : tc("closeConsequence", { count: enrolledClubCount })
        }
        cancelLabel={t("cancel")}
        confirmLabel={closed ? t("reopenConfirm") : t("closeConfirm")}
        onConfirm={handleConfirm}
      />
    </>
  );
}

function resolveErrorMessage(
  error: unknown,
  closed: boolean,
  t: {
    (
      key:
        | "errors.noEnrolledClubs"
        | "errors.alreadyClosed"
        | "errors.reopenBlocked"
        | "errors.notActive"
        | "reopenFailed"
        | "closeFailed",
    ): string;
  },
): string {
  const code = getApiErrorCode(error);
  switch (code) {
    case "CAMPOREE_CLUB_REGISTRATION_NO_ENROLLED_CLUBS":
      return t("errors.noEnrolledClubs");
    case "CAMPOREE_CLUB_REGISTRATION_CLOSED":
      return t("errors.alreadyClosed");
    case "CAMPOREE_CLUB_REGISTRATION_REOPEN_BLOCKED":
      return t("errors.reopenBlocked");
    case "CAMPOREE_NOT_ACTIVE":
      return t("errors.notActive");
    default:
      break;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return closed ? t("reopenFailed") : t("closeFailed");
}
