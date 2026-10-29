"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarOff,
  CheckCircle2,
  FileText,
  FolderOpen,
  Search,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { closeYear, getYearEndPreview } from "@/lib/api/year-end";
import type { YearEndCloseResult, YearEndPreview } from "@/lib/api/year-end";
import type { EcclesiasticalYear } from "@/lib/api/catalogs";

interface ImpactCardProps {
  icon: React.ElementType;
  label: string;
  count: number;
  description: string;
}

function ImpactCard({ icon: Icon, label, count, description }: ImpactCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{count}</p>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function CloseResultPanel({ result }: { result: YearEndCloseResult }) {
  const t = useTranslations("year_end.result");
  const items = [
    { label: t("enrollments"), value: result.enrollmentsClosed },
    { label: t("folders"), value: result.foldersClosed },
    { label: t("reports"), value: result.reportsGenerated },
    { label: t("investiture"), value: result.investiturePendingClosed },
  ];
  return (
    <div role="status" className="rounded-lg border border-success/20 bg-success/5 p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="space-y-3">
          <p className="font-semibold text-success">{t("title")}</p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((item) => (
              <div key={item.label}>
                <dd className="text-xl font-bold tabular-nums text-success">{item.value}</dd>
                <dt className="text-xs text-success/80">{item.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

interface YearEndClientPageProps {
  ecclesiasticalYears: EcclesiasticalYear[];
}

export function YearEndClientPage({ ecclesiasticalYears }: YearEndClientPageProps) {
  const t = useTranslations("year_end");
  // Only the active year can be closed (the backend rejects any other).
  const activeYear = ecclesiasticalYears.find((year) => year.active) ?? null;

  const [preview, setPreview] = useState<YearEndPreview | null>(null);
  const [closeResult, setCloseResult] = useState<YearEndCloseResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!activeYear) {
    return (
      <EmptyState
        icon={CalendarOff}
        title={t("page.noActiveYearTitle")}
        description={t("page.noActiveYearDescription")}
      />
    );
  }

  const yearId = activeYear.ecclesiastical_year_id;
  const yearName = activeYear.name ?? String(yearId);

  async function handlePreview() {
    setIsPreviewing(true);
    setPreviewError(null);
    setPreview(null);
    setCloseResult(null);
    try {
      setPreview(await getYearEndPreview(yearId));
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : t("errors.preview_failed"));
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleConfirmClose() {
    setIsClosing(true);
    try {
      const result = await closeYear(yearId);
      setCloseResult(result);
      setPreview(null);
      toast.success(t("toasts.year_closed"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("errors.close_year_failed"));
    } finally {
      setIsClosing(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("client.cardTitle", { year: yearName })}</CardTitle>
          <CardDescription>{t("client.cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => void handlePreview()}
            disabled={isPreviewing || closeResult !== null}
          >
            <Search className="size-4" />
            {isPreviewing ? t("client.previewLoading") : t("client.previewButton")}
          </Button>
        </CardContent>
      </Card>

      {previewError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {previewError}
        </div>
      )}

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>{t("preview.title")}</CardTitle>
            <CardDescription>{t("preview.description", { year: yearName })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <ImpactCard
                icon={Users}
                label={t("preview.impactEnrollmentsLabel")}
                count={preview.enrollmentsToClose}
                description={t("preview.impactEnrollmentsDescription")}
              />
              <ImpactCard
                icon={FolderOpen}
                label={t("preview.impactFoldersLabel")}
                count={preview.foldersToClose}
                description={t("preview.impactFoldersDescription")}
              />
              <ImpactCard
                icon={FileText}
                label={t("preview.impactReportsLabel")}
                count={preview.reportsToGenerate}
                description={t("preview.impactReportsDescription")}
              />
            </div>

            {preview.enrollmentDetails.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("preview.clubsTitle")}</p>
                <ul className="divide-y divide-border/60 rounded-lg border border-border/60 text-sm">
                  {preview.enrollmentDetails.map((detail) => (
                    <li
                      key={detail.club_enrollment_id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <span className="font-medium">{detail.clubName}</span>
                      <span className="text-muted-foreground">{detail.clubType}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground dark:text-warning" />
                <p className="text-sm text-warning-foreground dark:text-warning">
                  {t("preview.irreversible")}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
                disabled={isClosing}
              >
                <AlertTriangle className="size-4" />
                {t("preview.closeButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {closeResult && <CloseResultPanel result={closeResult} />}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm.title", { year: yearName })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm.description", {
                enrollments: preview?.enrollmentsToClose ?? 0,
                folders: preview?.foldersToClose ?? 0,
                reports: preview?.reportsToGenerate ?? 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>{t("confirm.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmClose()}
              disabled={isClosing}
              variant="destructive-solid"
            >
              {isClosing ? t("client.confirmCloseLoading") : t("client.confirmCloseButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
