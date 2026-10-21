"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useConsentErrorMessage } from "@/components/membership/use-consent-error-message";
import {
  CONSENT_EVIDENCE_ACCEPTED_TYPES,
  CONSENT_EVIDENCE_MAX_BYTES,
  getConsentEvidence,
  getConsentErrorCode,
  uploadConsentEvidence,
  verifyConsent,
  VERIFY_BLOCK_CODE,
  type ConsentEvidence,
  type MembershipRequest,
} from "@/lib/api/membership-requests";
import { useFormatDateTime } from "@/lib/format-locale";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserName(user?: MembershipRequest["users"]): string {
  if (!user) return "—";
  const parts = [user.name, user.paternal_last_name, user.maternal_last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : (user.email ?? "—");
}

function isAcceptedType(file: File): boolean {
  return (CONSENT_EVIDENCE_ACCEPTED_TYPES as readonly string[]).includes(file.type);
}

/** Refresh the signed URL this long before it expires. */
const SIGNED_URL_REFRESH_MARGIN_SECONDS = 60;
const SIGNED_URL_MIN_REFRESH_SECONDS = 30;

function refreshIntervalMs(expiresInSeconds: number | undefined): number {
  const ttl = typeof expiresInSeconds === "number" && expiresInSeconds > 0 ? expiresInSeconds : 900;
  return Math.max(ttl - SIGNED_URL_REFRESH_MARGIN_SECONDS, SIGNED_URL_MIN_REFRESH_SECONDS) * 1000;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MembershipConsentVerifyDialogProps {
  open: boolean;
  clubSectionId: number;
  request: MembershipRequest;
  onOpenChange: (open: boolean) => void;
  /** Called after consent was verified (the list should be refreshed). */
  onSuccess: () => void;
  /**
   * Called when verifying fails (after the error toast). Lets the parent react to
   * codes that mean the row is stale, e.g. MR_NOT_FOUND (someone else got there first).
   */
  onVerifyError?: (error: unknown) => void;
  /**
   * Whether the viewer may also approve (club_members:approve). When false
   * (verify-only reviewers) the approve option is not offered, the request
   * always sends `approve: false` and the consent form cannot be uploaded or
   * replaced (the backend rejects it).
   */
  canApprove?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembershipConsentVerifyDialog({
  open,
  clubSectionId,
  request,
  onOpenChange,
  onSuccess,
  onVerifyError,
  canApprove = true,
}: MembershipConsentVerifyDialogProps) {
  const t = useTranslations("membership.consent");
  const formatDateTime = useFormatDateTime();
  const errorMessage = useConsentErrorMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userName = getUserName(request.users);
  const guardians = request.consent?.guardians ?? [];

  // Once the director uploads a form here, the evidence query is enabled even if
  // the (stale) list item said there was none.
  const [uploadedHere, setUploadedHere] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [approveChecked, setApproveChecked] = useState(true);
  const approve = canApprove && approveChecked;
  const [fileError, setFileError] = useState<string | null>(null);
  // The signed URL lives 15 min. If the image fails to load we refetch it ONCE
  // and retry; a successful load re-arms the retry for a later expiry.
  const [imageFailed, setImageFailed] = useState(false);
  const imageRetriedRef = useRef(false);

  const evidenceExpected = Boolean(request.consent?.evidence_uploaded) || uploadedHere;

  const evidenceQuery = useQuery<ConsentEvidence, Error>({
    queryKey: ["membership", "consent-evidence", clubSectionId, request.assignment_id],
    queryFn: () => getConsentEvidence(clubSectionId, request.assignment_id),
    enabled: open && evidenceExpected,
    // Signed URLs live 15 min: never serve a cached one on re-open.
    staleTime: 0,
    gcTime: 0,
    retry: false,
    // Keep links (PDF / open in new tab) valid while the dialog stays open.
    refetchInterval: (query) =>
      query.state.data ? refreshIntervalMs(query.state.data.expires_in) : false,
  });

  const evidence = evidenceQuery.data ?? null;
  const evidenceNotFound =
    evidenceQuery.isError &&
    getConsentErrorCode(evidenceQuery.error) === "GUARDIANSHIP_EVIDENCE_NOT_FOUND";
  const evidenceLoadError = evidenceQuery.isError && !evidenceNotFound;

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadConsentEvidence(clubSectionId, request.assignment_id, file),
    onSuccess: async () => {
      toast.success(t("toasts.evidence_uploaded"));
      setUploadedHere(true);
      await evidenceQuery.refetch();
    },
    onError: (error) => {
      toast.error(errorMessage(error, "upload"));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      verifyConsent(clubSectionId, request.assignment_id, {
        confirm_paper_form_reviewed: true,
        approve,
      }),
    onSuccess: (result) => {
      if (result.approve_error) {
        // Consent is committed; only the approval failed and can be retried.
        toast.warning(
          t("toasts.approve_failed", { reason: errorMessage(result.approve_error, "approve") }),
        );
      } else if (approve) {
        toast.success(t("toasts.verified_approved", { name: userName }));
      } else {
        toast.success(t("toasts.verified", { name: userName }));
      }
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(errorMessage(error, "verify"));
      // Verifying is allowed without approving (e.g. a coordinator): nothing was
      // written, so unticking Approve lets the retry only verify the consent.
      if (getConsentErrorCode(error) === "MR_APPROVE_PERMISSION_REQUIRED") {
        setApproveChecked(false);
      }
      onVerifyError?.(error);
    },
  });

  const isBusy = uploadMutation.isPending || verifyMutation.isPending;
  const hasEvidence = evidence !== null;
  // Server verdict (UI hint; verify-consent stays the authority).
  const verifyBlock = request.consent?.viewer_verify_block ?? null;
  const canConfirm = hasEvidence && reviewed && !isBusy && verifyBlock === null;

  function handleOpenChange(next: boolean) {
    if (isBusy) return;
    onOpenChange(next);
  }

  function handleImageLoad() {
    imageRetriedRef.current = false;
    setImageFailed(false);
  }

  function handleImageError() {
    if (!imageRetriedRef.current) {
      // Most likely an expired signed URL: get a fresh one and retry once.
      imageRetriedRef.current = true;
      void evidenceQuery.refetch();
      return;
    }
    setImageFailed(true);
  }

  function handleEvidenceReload() {
    imageRetriedRef.current = false;
    setImageFailed(false);
    void evidenceQuery.refetch();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Allow re-selecting the same file after an error.
    event.target.value = "";
    if (!file) return;

    if (!isAcceptedType(file)) {
      setFileError(t("validation.type"));
      return;
    }
    if (file.size > CONSENT_EVIDENCE_MAX_BYTES) {
      setFileError(t("validation.size"));
      return;
    }
    setFileError(null);
    uploadMutation.mutate(file);
  }

  const isImage = evidence?.content_type.startsWith("image/") ?? false;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-primary/10">
            <ShieldCheck className="text-primary" />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("dialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("dialog.description", { userName })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {verifyBlock && (
            <p
              role="alert"
              className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground"
            >
              {errorMessage(VERIFY_BLOCK_CODE[verifyBlock])}
            </p>
          )}

          {guardians.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {t("dialog.guardians_label")}
              </p>
              <ul className="space-y-1">
                {guardians.map((guardian) => (
                  <li
                    key={`${guardian.display_name}-${guardian.relationship_type_name ?? ""}`}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span className="font-medium">{guardian.display_name}</span>
                    {guardian.relationship_type_name && (
                      <span className="text-muted-foreground">
                        {guardian.relationship_type_name}
                      </span>
                    )}
                    {guardian.is_primary && (
                      <Badge variant="soft">{t("dialog.guardian_primary")}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence */}
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("dialog.evidence_title")}
              </p>
              {(evidenceLoadError || imageFailed) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleEvidenceReload}
                >
                  <RefreshCw className="size-3" />
                  {t("dialog.evidence_reload")}
                </Button>
              )}
            </div>

            {evidenceExpected && evidenceQuery.isFetching && !evidence && (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-40 w-full" />
                <span className="sr-only">{t("dialog.evidence_loading")}</span>
              </div>
            )}

            {evidenceLoadError && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(evidenceQuery.error, "evidence_load")}
              </p>
            )}

            {imageFailed && !evidenceLoadError && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(null, "evidence_load")}
              </p>
            )}

            {(!evidenceExpected || evidenceNotFound) && !evidence && (
              <p className="text-sm text-muted-foreground">
                {canApprove ? t("dialog.evidence_none") : t("dialog.evidence_none_verify_only")}
              </p>
            )}

            {evidence && (
              <div className="space-y-2">
                {isImage ? (
                  <a
                    href={evidence.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-md border bg-background"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL of private evidence; next/image would proxy and cache it */}
                    <img
                      src={evidence.url}
                      alt={t("dialog.evidence_image_alt")}
                      className="max-h-72 w-full object-contain"
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  </a>
                ) : (
                  <Button asChild variant="outline" size="sm">
                    <a href={evidence.url} target="_blank" rel="noopener noreferrer">
                      <FileText className="size-4" />
                      {t("dialog.evidence_open_pdf")}
                    </a>
                  </Button>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {t("dialog.evidence_uploaded_at", {
                      date: formatDateTime(evidence.uploaded_at),
                    })}
                    {evidence.uploaded_by_display_name
                      ? ` ${t("dialog.evidence_uploaded_by", { name: evidence.uploaded_by_display_name })}`
                      : ""}
                  </span>
                  {isImage && (
                    <a
                      href={evidence.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      {t("dialog.evidence_open_new_tab")}
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t("dialog.evidence_expiry_note")}</p>
              </div>
            )}

            {/* Verify-only reviewers (coordinators) cannot upload: the backend rejects it. */}
            {canApprove && (
              <div className="space-y-1.5 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={CONSENT_EVIDENCE_ACCEPTED_TYPES.join(",")}
                  className="hidden"
                  data-testid="consent-file-input"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {uploadMutation.isPending
                    ? t("dialog.uploading")
                    : hasEvidence
                      ? t("dialog.replace")
                      : t("dialog.upload")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("dialog.upload_hint")}</p>
                {fileError && (
                  <p role="alert" className="text-sm text-destructive">
                    {fileError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Confirmation */}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent-reviewed"
                checked={reviewed}
                disabled={isBusy}
                onCheckedChange={(checked) => setReviewed(checked === true)}
              />
              <Label htmlFor="consent-reviewed" className="text-sm leading-snug">
                {t("dialog.confirm_checkbox")}
              </Label>
            </div>
            {canApprove && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="consent-approve"
                  checked={approveChecked}
                  disabled={isBusy}
                  onCheckedChange={(checked) => setApproveChecked(checked === true)}
                />
                <Label htmlFor="consent-approve" className="text-sm leading-snug">
                  {t("dialog.approve_checkbox")}
                </Label>
              </div>
            )}
            {!canApprove && (
              <p className="text-xs text-muted-foreground">{t("dialog.verify_only_note")}</p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy}>{t("dialog.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm}
            onClick={(event) => {
              // Keep the dialog open until the request settles (errors stay visible).
              event.preventDefault();
              if (canConfirm) verifyMutation.mutate();
            }}
          >
            {verifyMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {verifyMutation.isPending ? t("dialog.confirming") : t("dialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
