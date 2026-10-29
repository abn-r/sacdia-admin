"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Download, RefreshCw } from "lucide-react";
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
import { Button } from "@/components/ui/button";

interface PeriodicReportActionsProps {
  status: string;
  /** reports:update — Recalcular. Only drafts can be recalculated. */
  canUpdate: boolean;
  /** reports:update — Finalizar. Only drafts can be finalized. */
  canFinalize: boolean;
  /** reports:download */
  canDownload: boolean;
  regenerating: boolean;
  downloading: boolean;
  /** "Club Águilas · Trimestre 2 de 2026" — named in the confirmation. */
  reportLabel: string;
  onRegenerate: () => void;
  onFinalize: () => Promise<void>;
  onDownload: () => void;
}

export function PeriodicReportActions({
  status,
  canUpdate,
  canFinalize,
  canDownload,
  regenerating,
  downloading,
  reportLabel,
  onRegenerate,
  onFinalize,
  onDownload,
}: PeriodicReportActionsProps) {
  const t = useTranslations("periodicReports.common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const isDraft = status === "draft";

  async function handleConfirm() {
    setFinalizing(true);
    try {
      await onFinalize();
    } finally {
      setFinalizing(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {isDraft && canUpdate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={regenerating}
            disabled={finalizing}
            onClick={onRegenerate}
          >
            <RefreshCw className="size-4" />
            {t("actions.regenerate")}
          </Button>
        ) : null}
        {isDraft && canFinalize ? (
          <Button
            type="button"
            size="sm"
            disabled={regenerating}
            onClick={() => setConfirmOpen(true)}
          >
            <CheckCircle2 className="size-4" />
            {t("actions.finalize")}
          </Button>
        ) : null}
        {canDownload ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={downloading}
            onClick={onDownload}
          >
            <Download className="size-4" />
            {t("actions.downloadPdf")}
          </Button>
        ) : null}
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!finalizing) setConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-warning/10">
              <AlertTriangle className="size-5 text-warning" />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("finalizeConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("finalizeConfirm.description", { report: reportLabel })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finalizing}>{t("finalizeConfirm.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              loading={finalizing}
              onClick={(event) => {
                // Keep the dialog open while the request is in flight.
                event.preventDefault();
                void handleConfirm();
              }}
            >
              {t("finalizeConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
