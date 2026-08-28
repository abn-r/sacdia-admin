"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closed = isClubRegistrationClosed(closedAt);
  const closeBlocked =
    !camporeeActive || (!clubsLoadFailed && enrolledClubCount === 0);
  const reopenBlocked = hasScoringArtifacts;

  if (!canManage) return null;

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (closed) {
        await reopenCamporeeClubRegistration(camporeeId, { isUnion });
        toast.success(t("reopenSuccess"));
      } else {
        await closeCamporeeClubRegistration(camporeeId, { isUnion });
        toast.success(t("closeSuccess"));
      }
      setConfirmOpen(false);
      router.refresh();
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, closed, t));
    } finally {
      setIsSubmitting(false);
    }
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={Boolean(disabledReason)}
        title={disabledReason}
        data-testid={closed ? "club-registration-reopen" : "club-registration-close"}
      >
        {closed ? (
          <LockOpen className="mr-2 size-3.5" />
        ) : (
          <Lock className="mr-2 size-3.5" />
        )}
        {closed ? t("reopenButton") : t("closeButton")}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {closed ? t("reopenTitle") : t("closeTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {closed ? t("reopenDescription") : t("closeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? closed
                  ? t("reopening")
                  : t("closing")
                : closed
                  ? t("reopenConfirm")
                  : t("closeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
