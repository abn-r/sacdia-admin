"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Download, RefreshCw } from "lucide-react";
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
  /**
   * Recalcular: global super-admin / admin with reports:update. It rewrites a
   * closed report, so it is only offered on closed ones (open reports are
   * recomputed by the backend on every read).
   */
  canRegenerate: boolean;
  /** reports:download */
  canDownload: boolean;
  /** The report is closed (status finalized). */
  isClosed: boolean;
  downloading: boolean;
  /** "Club Águilas · Trimestre 2 de 2026" — named in the confirmation. */
  reportLabel: string;
  onRegenerate: () => Promise<void>;
  onDownload: () => void;
}

export function PeriodicReportActions({
  canRegenerate,
  canDownload,
  isClosed,
  downloading,
  reportLabel,
  onRegenerate,
  onDownload,
}: PeriodicReportActionsProps) {
  const t = useTranslations("periodicReports.common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function handleConfirm() {
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {isClosed && canRegenerate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={regenerating}
            onClick={() => setConfirmOpen(true)}
          >
            <RefreshCw className="size-4" />
            {t("actions.regenerate")}
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
          if (!regenerating) setConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-warning/10">
              <AlertTriangle className="size-5 text-warning" />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("regenerateConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("regenerateConfirm.description", { report: reportLabel })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerating}>
              {t("regenerateConfirm.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              loading={regenerating}
              onClick={(event) => {
                // Keep the dialog open while the request is in flight.
                event.preventDefault();
                void handleConfirm();
              }}
            >
              {t("regenerateConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
