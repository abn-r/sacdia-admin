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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  confirmLabel: string;
  tone?: "default" | "destructive";
  pending?: boolean;
  /** Receives the trimmed reason. */
  onConfirm: (reason: string) => void | Promise<void>;
}

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  min = 5,
  max = 500,
  confirmLabel,
  tone = "destructive",
  pending = false,
  onConfirm,
}: ReasonDialogProps) {
  const t = useTranslations("shared.kit.reason");
  const tc = useTranslations("shared.kit.confirm");
  const id = useId();
  const [value, setValue] = useState("");
  const [attempted, setAttempted] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setValue("");
      setAttempted(false);
    }
  }

  const trimmed = value.trim();
  const valid = trimmed.length >= min && trimmed.length <= max;
  const showError = attempted && trimmed.length < min;

  async function handleConfirm(event: React.MouseEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!valid || pending) return;
    await onConfirm(trimmed);
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription asChild>
              <div>{description}</div>
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor={id}>{label ?? t("label")}</Label>
          <Textarea
            id={id}
            value={value}
            maxLength={max}
            placeholder={placeholder ?? t("placeholder")}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={showError || undefined}
            aria-describedby={`${id}-hint`}
            disabled={pending}
            rows={3}
          />
          <div id={`${id}-hint`} className="flex items-start justify-between gap-3 text-xs">
            {showError ? (
              <span role="alert" className="text-destructive">
                {t("tooShort", { min })}
              </span>
            ) : (
              <span className="text-muted-foreground">{t("hint", { min, max })}</span>
            )}
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {t("counter", { count: value.length, max })}
            </span>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant={tone === "destructive" ? "destructive-solid" : "default"}
            loading={pending}
            disabled={!valid}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
