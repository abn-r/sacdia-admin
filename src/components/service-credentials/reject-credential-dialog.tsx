"use client";

import { useState } from "react";
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  SERVICE_CREDENTIAL_REASON_MAX,
  SERVICE_CREDENTIAL_REASON_MIN,
} from "@/lib/api/service-credentials";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personName: string;
  submitting: boolean;
  /** Server-side failure to show next to the field (the dialog stays open). */
  serverError: string | null;
  onConfirm: (reason: string) => void;
};

/**
 * Rejecting is final for the reviewer (the person has to upload a new
 * constancia), so it asks for confirmation and a reason of 5-500 characters.
 */
export function RejectCredentialDialog({ open, onOpenChange, submitting, ...body }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <AlertDialogContent>
        {/* Mounted only while open: the reason resets every time it opens. */}
        <RejectBody submitting={submitting} {...body} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RejectBody({
  personName,
  submitting,
  serverError,
  onConfirm,
}: Omit<Props, "open" | "onOpenChange">) {
  const t = useTranslations("service_credentials.detail.reject");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < SERVICE_CREDENTIAL_REASON_MIN;
  const tooLong = trimmed.length > SERVICE_CREDENTIAL_REASON_MAX;
  const validationError = !touched
    ? null
    : tooShort
      ? t("reasonTooShort", { min: SERVICE_CREDENTIAL_REASON_MIN })
      : tooLong
        ? t("reasonTooLong", { max: SERVICE_CREDENTIAL_REASON_MAX })
        : null;
  const error = validationError ?? serverError;

  function submit() {
    setTouched(true);
    if (tooShort || tooLong) return;
    onConfirm(trimmed);
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("title")}</AlertDialogTitle>
        <AlertDialogDescription>{t("description", { name: personName })}</AlertDialogDescription>
      </AlertDialogHeader>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="service-credential-reject-reason">
          {t("reasonLabel")}
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        </FieldLabel>
        <Textarea
          id="service-credential-reject-reason"
          rows={4}
          value={reason}
          maxLength={SERVICE_CREDENTIAL_REASON_MAX + 100}
          aria-invalid={error ? true : undefined}
          aria-describedby="service-credential-reject-reason-hint"
          onChange={(event) => setReason(event.target.value)}
          onBlur={() => setTouched(true)}
          disabled={submitting}
        />
        <FieldDescription id="service-credential-reject-reason-hint">
          {t("reasonHint", { min: SERVICE_CREDENTIAL_REASON_MIN, max: SERVICE_CREDENTIAL_REASON_MAX })}
        </FieldDescription>
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={submitting}>{t("cancel")}</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive-solid"
          loading={submitting}
          onClick={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {t("confirm")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
