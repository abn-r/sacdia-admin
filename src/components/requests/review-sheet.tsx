"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";

export const REVIEW_REASON_MIN = 5;
export const REVIEW_REASON_MAX = 500;

export interface ReviewSheetApprove {
  label: string;
  /** Receives the optional comment (trimmed, `undefined` when empty). */
  onConfirm: (comment: string | undefined) => void | Promise<void>;
  /** Shows an optional comment field above the buttons. */
  comment?: { label: string; hint?: string };
  disabled?: boolean;
}

export interface ReviewSheetReject {
  /** Footer button that switches to the reason form, e.g. "Rechazar…". */
  label: string;
  /** Destructive confirm button, e.g. "Rechazar traslado". */
  confirmLabel: string;
  /** Who will read the reason, e.g. "La persona y su director verán este motivo." */
  audience: string;
  /** Receives the trimmed reason (5–500 characters). */
  onConfirm: (reason: string) => void | Promise<void>;
}

export interface ReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Wide sheet for content that needs room (the guardian form). */
  wide?: boolean;
  children: ReactNode;
  approve?: ReviewSheetApprove;
  /** Custom primary action (review mode only), used instead of `approve`. */
  primary?: ReactNode;
  reject?: ReviewSheetReject;
  /** Open straight on the reason form (row action "Rechazar"). */
  startRejecting?: boolean;
  /** Blocks every footer action while the caller is busy (e.g. an upload). */
  busy?: boolean;
  /** Message shown above the footer; wins over errors raised by the actions. */
  error?: string | null;
  /** Maps a rejected `onConfirm` to the inline message. */
  errorMessage?: (error: unknown) => string;
}

/**
 * Side sheet for reviewing one request. "Rechazar…" swaps the footer to a
 * required reason form that says who will read it: there is never a second
 * dialog. Actions resolve to close the sheet; a rejection keeps it open with
 * the message inline.
 */
export function ReviewSheet({
  open,
  onOpenChange,
  title,
  description,
  wide = false,
  children,
  approve,
  primary,
  reject,
  startRejecting = false,
  busy = false,
  error: externalError = null,
  errorMessage,
}: ReviewSheetProps) {
  const t = useTranslations("queues.requests.sheet");
  const base = useId();
  const [rejecting, setRejecting] = useState(startRejecting && reject !== undefined);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const locked = pending || busy;
  const trimmedReason = reason.trim();
  const reasonTooShort = trimmedReason.length < REVIEW_REASON_MIN;
  const reasonTooLong = trimmedReason.length > REVIEW_REASON_MAX;
  const reasonError =
    attempted && reasonTooShort
      ? t("reasonTooShort", { min: REVIEW_REASON_MIN })
      : reasonTooLong
        ? t("reasonTooLong", { max: REVIEW_REASON_MAX })
        : null;
  const error = externalError ?? actionError;

  function messageOf(caught: unknown): string {
    if (errorMessage) return errorMessage(caught);
    return caught instanceof ApiError ? caught.message : t("unexpected");
  }

  async function run(action: () => void | Promise<void>) {
    setPending(true);
    setActionError(null);
    try {
      await action();
      onOpenChange(false);
    } catch (caught) {
      setActionError(messageOf(caught));
    } finally {
      setPending(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (locked && !next) return;
    onOpenChange(next);
  }

  function confirmReject() {
    if (!reject) return;
    setAttempted(true);
    if (reasonTooShort || reasonTooLong) return;
    void run(() => reject.onConfirm(trimmedReason));
  }

  function backToReview() {
    setRejecting(false);
    setAttempted(false);
    setActionError(null);
  }

  const reasonId = `${base}-reason`;
  const hintId = `${base}-reason-hint`;
  const commentId = `${base}-comment`;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className={`flex w-full flex-col gap-0 p-0 ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
      >
        <SheetHeader className="border-b pr-14">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>

        <SheetFooter className="gap-3 border-t">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {rejecting && reject ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={reasonId}>
                  {t("reasonLabel")}
                  <span className="ml-0.5 text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Textarea
                  id={reasonId}
                  rows={3}
                  value={reason}
                  maxLength={REVIEW_REASON_MAX + 100}
                  disabled={locked}
                  aria-invalid={reasonError ? true : undefined}
                  aria-describedby={hintId}
                  onChange={(event) => setReason(event.target.value)}
                />
                <p
                  id={hintId}
                  className={`text-xs ${reasonError ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {reasonError ?? `${reject.audience} ${t("reasonHint", { min: REVIEW_REASON_MIN, max: REVIEW_REASON_MAX })}`}
                </p>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button type="button" variant="outline" disabled={locked} onClick={backToReview}>
                  {t("back")}
                </Button>
                <Button
                  type="button"
                  variant="destructive-solid"
                  loading={pending}
                  disabled={locked}
                  onClick={confirmReject}
                >
                  {reject.confirmLabel}
                </Button>
              </div>
            </>
          ) : (
            <>
              {approve?.comment ? (
                <div className="space-y-1.5">
                  <Label htmlFor={commentId}>{approve.comment.label}</Label>
                  <Textarea
                    id={commentId}
                    rows={2}
                    value={comment}
                    maxLength={REVIEW_REASON_MAX}
                    disabled={locked}
                    onChange={(event) => setComment(event.target.value)}
                  />
                  {approve.comment.hint ? (
                    <p className="text-xs text-muted-foreground">{approve.comment.hint}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                {reject ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={locked}
                    onClick={() => setRejecting(true)}
                  >
                    {reject.label}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" disabled={locked} onClick={() => handleOpenChange(false)}>
                    {t("close")}
                  </Button>
                )}
                {primary ??
                  (approve ? (
                    <Button
                      type="button"
                      loading={pending}
                      disabled={locked || approve.disabled}
                      onClick={() => void run(() => approve.onConfirm(comment.trim() || undefined))}
                    >
                      {approve.label}
                    </Button>
                  ) : null)}
              </div>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
