"use client";

import { useRef } from "react";
import { Image, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FINANCE_EVIDENCE_ACCEPT,
  MAX_FINANCE_EVIDENCES,
  type FinanceEvidence,
} from "@/lib/api/finances";
import { financeEvidenceDisplayLabel } from "@/lib/finances/evidence-label";

type FinanceEvidenceFieldProps = {
  existingEvidences?: FinanceEvidence[];
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  disabled?: boolean;
};

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export function FinanceEvidenceField({
  existingEvidences = [],
  pendingFiles,
  onPendingFilesChange,
  disabled = false,
}: FinanceEvidenceFieldProps) {
  const t = useTranslations("finances");
  const inputRef = useRef<HTMLInputElement>(null);
  const totalCount = existingEvidences.length + pendingFiles.length;
  const canAddMore = totalCount < MAX_FINANCE_EVIDENCES;

  function handlePickFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (picked.length === 0) return;

    const valid = picked.filter(isImageFile);
    if (valid.length !== picked.length) {
      toast.error(t("form.evidenceImageOnly"));
    }
    if (valid.length === 0) return;

    const slotsLeft = MAX_FINANCE_EVIDENCES - totalCount;
    if (slotsLeft <= 0) {
      toast.error(t("form.evidenceLimit"));
      return;
    }
    const next = [...pendingFiles, ...valid].slice(0, slotsLeft);
    onPendingFilesChange(next);
  }

  function removePending(index: number) {
    onPendingFilesChange(pendingFiles.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{t("form.evidenceLabel")}</Label>
        <span className="text-xs text-muted-foreground">
          {t("form.evidenceCount", { count: totalCount })}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{t("form.evidenceHint")}</p>

      <div className="flex flex-wrap gap-2">
        {existingEvidences.map((evidence, index) => {
          const label = financeEvidenceDisplayLabel(index + 1, t);

          return (
          <div
            key={evidence.evidence_id}
            className="relative size-20 overflow-hidden rounded-lg border border-border bg-muted"
            title={label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={evidence.url}
              alt={label}
              className="size-full object-cover"
            />
          </div>
          );
        })}

        {pendingFiles.map((file, index) => {
          const label = financeEvidenceDisplayLabel(
            existingEvidences.length + index + 1,
            t,
          );

          return (
          <div
            key={`${file.name}-${index}`}
            className="relative size-20 overflow-hidden rounded-lg border border-border bg-muted"
            title={label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={URL.createObjectURL(file)}
              alt={label}
              className="size-full object-cover"
            />
            {!disabled && (
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="absolute top-1 right-1 size-6 bg-background/90"
                onClick={() => removePending(index)}
                aria-label={t("form.evidenceRemove")}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
          );
        })}

        {canAddMore && !disabled && (
          <Button
            type="button"
            variant="outline"
            className="size-20 flex-col gap-1 px-1 text-xs"
            onClick={() => inputRef.current?.click()}
          >
            <Image className="size-4" />
            <span className="line-clamp-2 text-center leading-tight">
              {t("form.evidenceAdd")}
            </span>
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={FINANCE_EVIDENCE_ACCEPT}
        multiple
        className="sr-only"
        onChange={handlePickFiles}
        disabled={disabled || !canAddMore}
      />
    </div>
  );
}
