"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ErrorState } from "@/components/shared/error-state";
import { errorStateFromError } from "@/lib/api/error-state";
import {
  classifyServiceCredentialError,
  SERVICE_CREDENTIALS_KEY,
  SERVICE_CREDENTIALS_LIST_KEY,
  serviceCredentialDetailKey,
  ServiceCredentialStatusBadge,
  todayIsoDate,
  useRoleLabel,
  useServiceCredentialErrorMessage,
} from "@/components/service-credentials/service-credential-shared";
import { SignedFilePreview } from "@/components/service-credentials/signed-file-preview";
import {
  SERVICE_CREDENTIAL_REASON_MAX,
  SERVICE_CREDENTIAL_REASON_MIN,
  approveServiceCredential,
  getServiceCredentialReview,
  rejectServiceCredential,
  type ServiceCredentialReviewDetail,
} from "@/lib/api/service-credentials";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { useFormatDate } from "@/lib/format-locale";

type Props = {
  credentialId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SCREEN_ID = "service-credentials-review";

function displayName(detail: ServiceCredentialReviewDetail): string {
  return detail.user.name?.trim() || detail.user.user_id;
}

/**
 * Side sheet with the file, the metadata and the review actions. The detail is
 * always refetched on open (`gcTime: 0`): its signed file URL lives 15 minutes.
 */
export function ServiceCredentialReviewSheet({ credentialId, open, onOpenChange }: Props) {
  const t = useTranslations("service_credentials");
  const formatDate = useFormatDate();
  const roleLabel = useRoleLabel();
  const errorMessage = useServiceCredentialErrorMessage();
  const queryClient = useQueryClient();
  const { canCapability } = useScreenAccess();
  const canApprove = canCapability(SCREEN_ID, "approve");
  const canReject = canCapability(SCREEN_ID, "reject");

  const [expiresAt, setExpiresAt] = useState("");
  const [expiresError, setExpiresError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Reject happens inside the sheet: the reason is required and replaces the footer actions.
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: serviceCredentialDetailKey(credentialId ?? ""),
    queryFn: () => getServiceCredentialReview(credentialId as string),
    enabled: open && credentialId !== null,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
  const detail = query.data;

  function resetLocalState() {
    setExpiresAt("");
    setExpiresError(null);
    setActionError(null);
    setRejecting(false);
    setReason("");
    setReasonTouched(false);
    setRejectError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetLocalState();
    onOpenChange(next);
  }

  function refreshList() {
    void queryClient.invalidateQueries({ queryKey: SERVICE_CREDENTIALS_LIST_KEY });
  }

  /** 404: gone from the scope, close. 409: someone reviewed it, reload the detail. */
  function handleStaleError(error: unknown): boolean {
    const kind = classifyServiceCredentialError(error);
    if (kind === "other") return false;
    toast.error(errorMessage(error));
    refreshList();
    if (kind === "notFound") {
      handleOpenChange(false);
    } else {
      setRejecting(false);
      void queryClient.invalidateQueries({ queryKey: SERVICE_CREDENTIALS_KEY });
    }
    return true;
  }

  const approve = useMutation({
    mutationFn: (input: { id: string; expires_at?: string }) =>
      approveServiceCredential(input.id, input.expires_at ? { expires_at: input.expires_at } : {}),
    onSuccess: () => {
      toast.success(t("toasts.approved"));
      refreshList();
      handleOpenChange(false);
    },
    onError: (error) => {
      if (!handleStaleError(error)) setActionError(errorMessage(error));
    },
  });

  const reject = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      rejectServiceCredential(input.id, input.reason),
    onSuccess: () => {
      toast.success(t("toasts.rejected"));
      refreshList();
      handleOpenChange(false);
    },
    onError: (error) => {
      if (!handleStaleError(error)) setRejectError(errorMessage(error));
    },
  });

  function handleApprove() {
    if (!detail) return;
    setActionError(null);
    if (expiresAt && expiresAt <= todayIsoDate()) {
      setExpiresError(t("detail.approve.expiresPast"));
      return;
    }
    setExpiresError(null);
    approve.mutate({ id: detail.credential_id, ...(expiresAt ? { expires_at: expiresAt } : {}) });
  }

  const pending = detail?.status === "PENDING_REVIEW";
  const trimmedReason = reason.trim();
  const reasonInvalid =
    trimmedReason.length < SERVICE_CREDENTIAL_REASON_MIN || trimmedReason.length > SERVICE_CREDENTIAL_REASON_MAX;
  const reasonError = rejectError
    ? rejectError
    : !reasonTouched
      ? null
      : trimmedReason.length < SERVICE_CREDENTIAL_REASON_MIN
        ? t("detail.reject.reasonTooShort", { min: SERVICE_CREDENTIAL_REASON_MIN })
        : trimmedReason.length > SERVICE_CREDENTIAL_REASON_MAX
          ? t("detail.reject.reasonTooLong", { max: SERVICE_CREDENTIAL_REASON_MAX })
          : null;

  function handleReject() {
    if (!detail) return;
    setReasonTouched(true);
    if (reasonInvalid) return;
    setRejectError(null);
    reject.mutate({ id: detail.credential_id, reason: trimmedReason });
  }
  const busy = approve.isPending || reject.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b pr-14">
            <SheetTitle>{t("detail.title")}</SheetTitle>
            <SheetDescription>
              {detail
                ? t("detail.description", {
                    name: displayName(detail),
                    club: detail.club_name ?? "—",
                  })
                : null}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {query.isPending ? (
              <div className="space-y-4" aria-busy="true">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ) : query.isError || !detail ? (
              <ErrorState
                {...errorStateFromError(query.error)}
                variant="inline"
                title={t("detail.loadFailed")}
                onRetry={() => void query.refetch()}
              />
            ) : (
              <>
                <SignedFilePreview
                  url={detail.file_url}
                  mimeType={detail.mime_type}
                  fileName={detail.file_name}
                  personName={displayName(detail)}
                />

                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <Meta label={t("detail.fields.person")}>{displayName(detail)}</Meta>
                  <Meta label={t("detail.fields.club")}>{detail.club_name ?? "—"}</Meta>
                  <Meta label={t("detail.fields.completed")}>{formatDate(detail.completed_at)}</Meta>
                  <Meta label={t("detail.fields.submitted")}>{formatDate(detail.created_at)}</Meta>
                  {!pending ? (
                    <Meta label={t("detail.fields.status")}>
                      <ServiceCredentialStatusBadge status={detail.status} />
                    </Meta>
                  ) : null}
                  {detail.reviewed_at ? (
                    <Meta label={t("detail.fields.reviewedAt")}>{formatDate(detail.reviewed_at)}</Meta>
                  ) : null}
                  {detail.reviewer_role ? (
                    <Meta label={t("detail.fields.reviewer")}>{roleLabel(detail.reviewer_role)}</Meta>
                  ) : null}
                  {detail.expires_at ? (
                    <Meta label={t("detail.fields.expiresAt")}>{formatDate(detail.expires_at)}</Meta>
                  ) : null}
                  {detail.decision_reason ? (
                    <Meta label={t("detail.fields.reason")} className="sm:col-span-2">
                      <span className="whitespace-pre-wrap">{detail.decision_reason}</span>
                    </Meta>
                  ) : null}
                </dl>

                {pending && canApprove && !rejecting ? (
                  <Field data-invalid={expiresError ? true : undefined}>
                    <FieldLabel htmlFor="service-credential-expires-at">
                      {t("detail.approve.expiresLabel")}
                    </FieldLabel>
                    <Input
                      id="service-credential-expires-at"
                      type="date"
                      value={expiresAt}
                      min={todayIsoDate()}
                      aria-invalid={expiresError ? true : undefined}
                      aria-describedby="service-credential-expires-hint"
                      onChange={(event) => {
                        setExpiresAt(event.target.value);
                        setExpiresError(null);
                      }}
                      disabled={busy}
                      className="sm:max-w-56"
                    />
                    <FieldDescription id="service-credential-expires-hint">
                      {t("detail.approve.expiresHint")}
                    </FieldDescription>
                    {expiresError ? <FieldError>{expiresError}</FieldError> : null}
                  </Field>
                ) : null}

                {pending && rejecting ? (
                  <Field data-invalid={reasonError ? true : undefined}>
                    <FieldLabel htmlFor="service-credential-reject-reason">
                      {t("detail.reject.reasonLabel")}
                      <span className="ml-0.5 text-destructive" aria-hidden="true">
                        *
                      </span>
                    </FieldLabel>
                    <p className="text-sm text-muted-foreground">
                      {t("detail.reject.description", { name: displayName(detail) })}
                    </p>
                    <Textarea
                      id="service-credential-reject-reason"
                      rows={4}
                      value={reason}
                      maxLength={SERVICE_CREDENTIAL_REASON_MAX + 100}
                      aria-invalid={reasonError ? true : undefined}
                      aria-describedby="service-credential-reject-reason-hint"
                      onChange={(event) => setReason(event.target.value)}
                      onBlur={() => setReasonTouched(true)}
                      disabled={reject.isPending}
                    />
                    <FieldDescription id="service-credential-reject-reason-hint">
                      {t("detail.reject.reasonHint", {
                        min: SERVICE_CREDENTIAL_REASON_MIN,
                        max: SERVICE_CREDENTIAL_REASON_MAX,
                      })}
                    </FieldDescription>
                    {reasonError ? <FieldError>{reasonError}</FieldError> : null}
                  </Field>
                ) : null}

                {!pending ? (
                  <Alert>
                    <CheckCircle2 className="size-4" />
                    <AlertDescription>{t("detail.alreadyReviewed")}</AlertDescription>
                  </Alert>
                ) : null}

                {actionError ? (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{actionError}</AlertDescription>
                  </Alert>
                ) : null}
              </>
            )}
          </div>

          <SheetFooter className="border-t sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t("detail.close")}
            </Button>
            {detail && pending ? (
              rejecting ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={reject.isPending}
                    onClick={() => {
                      setRejecting(false);
                      setReasonTouched(false);
                      setRejectError(null);
                    }}
                  >
                    {t("detail.reject.cancel")}
                  </Button>
                  <Button type="button" variant="destructive-solid" loading={reject.isPending} onClick={handleReject}>
                    {t("detail.reject.confirm")}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  {canReject ? (
                    <Button type="button" variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
                      {t("detail.reject.action")}
                    </Button>
                  ) : null}
                  {canApprove ? (
                    <Button type="button" loading={approve.isPending} disabled={busy} onClick={handleApprove}>
                      {t("detail.approve.action")}
                    </Button>
                  ) : null}
                </div>
              )
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </>
  );
}

function Meta({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
