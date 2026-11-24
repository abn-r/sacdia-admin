"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** State the impact in words (what changes, for whom). */
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
  /** External pending flag (e.g. a transition). Merged with the internal one. */
  pending?: boolean;
  /**
   * Runs on confirm. The dialog closes when it resolves. If it rejects, the
   * dialog stays open and shows the error message inline.
   */
  onConfirm: () => void | Promise<void>;
  /** Optional muted box (mockup `.sum`) between description and footer. */
  summary?: ReactNode;
  /** When set, the user must type this exact text before confirm enables. */
  typedConfirmation?: string;
  /** Label for the typed input; defaults to the text itself. */
  typedConfirmationLabel?: string;
  /** Controlled error message; takes precedence over a caught rejection. */
  error?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "default",
  pending = false,
  onConfirm,
  summary,
  typedConfirmation,
  typedConfirmationLabel,
  error,
}: ConfirmDialogProps) {
  const t = useTranslations("shared.kit.confirm");
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const [working, setWorking] = useState(false);
  const [caught, setCaught] = useState<string | null>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setTyped("");
      setCaught(null);
      setWorking(false);
    }
  }

  const busy = pending || working;
  const typedOk = typedConfirmation === undefined || typed === typedConfirmation;
  const message = error ?? caught;

  async function handleConfirm(event: React.MouseEvent) {
    event.preventDefault();
    if (busy || !typedOk) return;
    setCaught(null);
    setWorking(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setCaught(err instanceof Error && err.message ? err.message : t("working"));
    } finally {
      setWorking(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {summary ? (
          <div
            data-slot="confirm-summary"
            className="flex flex-col gap-0.5 rounded-lg bg-muted px-3.5 py-3 text-sm text-muted-foreground"
          >
            {summary}
          </div>
        ) : null}
        {typedConfirmation !== undefined ? (
          <div className="space-y-2">
            <Label htmlFor={inputId}>{typedConfirmationLabel ?? t("typed", { text: typedConfirmation })}</Label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              disabled={busy}
            />
          </div>
        ) : null}
        {message ? (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel ?? t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant={tone === "destructive" ? "destructive-solid" : "default"}
            loading={busy}
            disabled={!typedOk}
            onClick={handleConfirm}
          >
            {confirmLabel ?? t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
