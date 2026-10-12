"use client";

import { useTranslations } from "next-intl";
import { Eye, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  CertificateBulkImportBatch,
  CertificateBulkImportInstructor,
  CertificateBulkImportOcrState,
} from "@/lib/api/certificate-bulk-imports";

/** Backend `ocr_error_code` -> `review.ocrErrors.*` key. Unknown codes use `generic`. */
type OcrErrorKey =
  | "generic"
  | "failed"
  | "quota"
  | "unavailable"
  | "fileTooLarge"
  | "unsupportedType"
  | "pdfTooManyPages"
  | "pdfEncrypted"
  | "pdfInvalid";

const OCR_ERROR_KEYS: Record<string, OcrErrorKey> = {
  CERTIFICATE_IMPORT_OCR_FAILED: "failed",
  CERTIFICATE_IMPORT_OCR_QUOTA: "quota",
  CERTIFICATE_IMPORT_OCR_UNAVAILABLE: "unavailable",
  CERTIFICATE_IMPORT_OCR_FILE_TOO_LARGE: "fileTooLarge",
  CERTIFICATE_IMPORT_OCR_UNSUPPORTED_TYPE: "unsupportedType",
  CERTIFICATE_IMPORT_PDF_TOO_MANY_PAGES: "pdfTooManyPages",
  CERTIFICATE_IMPORT_PDF_ENCRYPTED: "pdfEncrypted",
  CERTIFICATE_IMPORT_PDF_INVALID: "pdfInvalid",
};

const OCR_BADGE_VARIANT: Record<
  CertificateBulkImportOcrState,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  pending: "outline",
  running: "outline",
  done: "success",
  empty: "secondary",
  failed: "destructive",
};

/**
 * Reading state of the batch. Renders nothing when the key is missing or
 * `null` (OCR never requested, e.g. a batch created by hand).
 */
export function OcrStateSummary({
  state,
  errorCode,
}: {
  state: CertificateBulkImportBatch["ocr_state"];
  errorCode: CertificateBulkImportBatch["ocr_error_code"];
}) {
  const t = useTranslations("certificate_bulk_imports.review");
  if (!state || !(state in OCR_BADGE_VARIANT)) return null;

  const errorKey: OcrErrorKey | null =
    state === "failed" && errorCode ? (OCR_ERROR_KEYS[errorCode] ?? "generic") : null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="ocr-state">
      <Badge variant={OCR_BADGE_VARIANT[state]}>{t(`ocrState.${state}.label`)}</Badge>
      <span className="text-xs text-muted-foreground">
        {t(`ocrState.${state}.description`)}
        {errorKey && <> {t(`ocrErrors.${errorKey}`)}</>}
      </span>
    </div>
  );
}

/** Instructor declared on a HONOR row: system user, external (unverified) or none. */
export function InstructorLine({
  instructor,
}: {
  instructor: CertificateBulkImportInstructor | null | undefined;
}) {
  const t = useTranslations("certificate_bulk_imports.review");

  if (!instructor) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("instructorLabel")} {t("noInstructor")}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>
        {t("instructorLabel")}{" "}
        <span className="font-medium text-foreground">{instructor.display_name}</span>
      </span>
      {instructor.kind === "EXTERNAL" ? (
        <Badge variant="warning">{t("instructorExternal")}</Badge>
      ) : (
        <Badge variant="secondary">{t("instructorUser")}</Badge>
      )}
    </div>
  );
}

/** The existing instructor of an already-approved honor is kept on approval (D7). */
export function InstructorConflictNotice({ approved }: { approved: boolean }) {
  const t = useTranslations("certificate_bulk_imports.review");
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/15 px-3 py-2 text-xs text-foreground"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <Badge variant="warning" className="w-fit">
          {t("conflictBadge")}
        </Badge>
        <span>{approved ? t("conflictApproved") : t("conflictPending")}</span>
      </div>
    </div>
  );
}

export function ViewInProofButton({
  page,
  onClick,
}: {
  page: number;
  onClick: () => void;
}) {
  const t = useTranslations("certificate_bulk_imports.review");
  return (
    <Button type="button" variant="link" size="sm" className="h-auto w-fit p-0" onClick={onClick}>
      <Eye aria-hidden="true" />
      {t("viewInProof", { page })}
    </Button>
  );
}

export function PageCountText({ count }: { count: number | null | undefined }) {
  const t = useTranslations("certificate_bulk_imports.review");
  if (typeof count !== "number" || count < 1) return null;
  return <>{t("pageCount", { count })}</>;
}

/** "Página N de M" for the opened file; M is dropped when `page_count` is unknown. */
export function PageOfText({
  page,
  total,
}: {
  page: number;
  total: number | null | undefined;
}) {
  const t = useTranslations("certificate_bulk_imports.review");
  if (typeof total === "number" && total >= 1) return <>{t("pageOf", { page, total })}</>;
  return <>{t("pageOnly", { page })}</>;
}
