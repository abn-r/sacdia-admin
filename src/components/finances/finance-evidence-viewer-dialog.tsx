"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Finance } from "@/lib/api/finances";
import { financeEvidenceDisplayLabel } from "@/lib/finances/evidence-label";

export interface FinanceEvidenceViewerDialogProps {
  finance: Finance | null;
  onOpenChange: (open: boolean) => void;
}

export function FinanceEvidenceViewerDialog({
  finance,
  onOpenChange,
}: FinanceEvidenceViewerDialogProps) {
  const t = useTranslations("finances");
  const evidences = finance?.evidences ?? [];
  const open = finance != null && evidences.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("evidenceViewer.title")}</DialogTitle>
          <DialogDescription>
            {finance?.description?.trim()
              ? finance.description
              : t("evidenceViewer.descriptionFallback")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {evidences.map((evidence, index) => {
            const label = financeEvidenceDisplayLabel(index + 1, t);

            return (
            <div
              key={evidence.evidence_id}
              className="overflow-hidden rounded-xl border border-border bg-muted/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evidence.url}
                alt={label}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
                <span className="truncate text-xs text-muted-foreground">
                  {label}
                </span>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a
                    href={evidence.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("evidenceViewer.openExternal")}
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
