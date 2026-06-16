"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  XCircle,
  Award,
  Eye,
  ClipboardList,
  ExternalLink,
  FileText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/empty-state";
import { InvestitureStatusBadge } from "@/components/investiture/investiture-status-badge";
import { HistoryTimeline } from "@/components/investiture/history-timeline";
import type { ValidateDialogProps } from "@/components/investiture/validate-dialog";
import type { InvestidoDialogProps } from "@/components/investiture/investido-dialog";

const ValidateDialog = dynamic<ValidateDialogProps>(
  () => import("@/components/investiture/validate-dialog").then((m) => ({ default: m.ValidateDialog })),
  { ssr: false, loading: () => null },
);

const InvestidoDialog = dynamic<InvestidoDialogProps>(
  () => import("@/components/investiture/investido-dialog").then((m) => ({ default: m.InvestidoDialog })),
  { ssr: false, loading: () => null },
);
import {
  getInvestitureClassProgress,
  getInvestitureHistory,
  type PendingEnrollment,
  type InvestitureHistoryEntry,
  type InvestitureClassProgress,
  type ValidateAction,
} from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";
import { useFormatDate } from "@/lib/format-locale";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberName(enrollment: PendingEnrollment, fallback: string): string {
  return getUserName(enrollment.user, fallback);
}

function getUserName(
  user: PendingEnrollment["user"],
  fallback: string,
): string {
  if (!user) return fallback;
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return full || user.email || fallback;
}

function getYearName(enrollment: PendingEnrollment): string {
  return enrollment.ecclesiastical_year?.name ?? "—";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingTableProps {
  enrollments: PendingEnrollment[];
  onRefresh: () => void;
}

// ─── State tracker for dialogs ────────────────────────────────────────────────

type DialogState =
  | { type: "validate"; enrollment: PendingEnrollment; action: ValidateAction }
  | { type: "investido"; enrollment: PendingEnrollment }
  | { type: "history"; enrollment: PendingEnrollment }
  | null;

// ─── Component ────────────────────────────────────────────────────────────────

export function PendingTable({ enrollments, onRefresh }: PendingTableProps) {
  const t = useTranslations("investiture");
  const formatDate = useFormatDate();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [historyEntries, setHistoryEntries] = useState<InvestitureHistoryEntry[]>([]);
  const [classProgress, setClassProgress] =
    useState<InvestitureClassProgress | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);

  async function openHistory(enrollment: PendingEnrollment) {
    setDialog({ type: "history", enrollment });
    setLoadingHistory(true);
    setLoadingProgress(true);
    setHistoryEntries([]);
    setClassProgress(null);
    try {
      const userId = enrollment.user?.user_id;
      const classId = enrollment.class?.class_id;
      const [entries, progress] = await Promise.all([
        getInvestitureHistory(enrollment.enrollment_id),
        userId && classId
          ? getInvestitureClassProgress({
              userId,
              classId,
              enrollmentId: enrollment.enrollment_id,
            })
          : Promise.resolve(null),
      ]);
      setHistoryEntries(entries);
      setClassProgress(progress);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("pendingTable.errorLoadDetail");
      toast.error(message);
    } finally {
      setLoadingHistory(false);
      setLoadingProgress(false);
    }
  }

  function closeDialog() {
    setDialog(null);
    setHistoryEntries([]);
    setClassProgress(null);
  }

  function getSubmitterRoleLabel(enrollment: PendingEnrollment): string {
    const roleName = enrollment.submitted_by?.role_name;
    if (roleName === "director") return t("pendingTable.roleDirector");
    if (roleName === "counselor") return t("pendingTable.roleCounselor");
    if (roleName === "coordinator") return t("pendingTable.roleCoordinator");
    if (roleName === "admin" || roleName === "super-admin") {
      return t("pendingTable.roleAdmin");
    }
    return (
      enrollment.submitted_by?.role_label ??
      roleName ??
      t("pendingTable.roleUnknown")
    );
  }

  function getProgressStatusLabel(status: string): string {
    if (status === "VALIDATED") return t("pendingTable.progressValidated");
    if (status === "REJECTED") return t("pendingTable.progressRejected");
    if (status === "PENDING_REVIEW") return t("pendingTable.progressPendingReview");
    return t("pendingTable.progressPending");
  }

  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={t("pendingTable.emptyTitle")}
        description={t("pendingTable.emptyDescription")}
      />
    );
  }

  const activeEnrollment = dialog?.enrollment ?? null;
  const memberName = activeEnrollment
    ? getMemberName(
        activeEnrollment,
        t("pendingTable.enrollmentFallback", { id: activeEnrollment.enrollment_id }),
      )
    : "";

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colMember")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colClassYear")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colClubSection")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colSubmittedBy")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colSubmitted")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colStatus")}
              </TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colActions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment, index) => {
              const name = getMemberName(
                enrollment,
                t("pendingTable.enrollmentFallback", { id: enrollment.enrollment_id }),
              );
              const submittedByName = getUserName(
                enrollment.submitted_by,
                t("pendingTable.unknownSubmitter"),
              );
              const submittedByRole = getSubmitterRoleLabel(enrollment);
              const isSubmitted =
                enrollment.investiture_status === "SUBMITTED_FOR_VALIDATION";
              const isApproved = enrollment.investiture_status === "APPROVED";

              return (
                <TableRow
                  key={enrollment.enrollment_id}
                  className={`hover:bg-muted/30 ${STAGGER_CLASSES}`}
                  style={getStaggerStyle(index)}
                >
                  <TableCell className="min-w-56 px-3 py-2.5 align-middle">
                    <div className="space-y-0.5">
                      <p className="font-medium leading-tight">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {enrollment.user?.email ?? t("pendingTable.enrollmentFallback", { id: enrollment.enrollment_id })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-44 px-3 py-2.5 align-middle">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium leading-tight">
                        {enrollment.class?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getYearName(enrollment)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-48 px-3 py-2.5 align-middle">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium leading-tight">
                        {enrollment.club?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enrollment.section?.name ?? t("pendingTable.sectionUnknown")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-48 px-3 py-2.5 align-middle">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium leading-tight">
                        {submittedByName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {submittedByRole}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                    {enrollment.submitted_at ? formatDate(enrollment.submitted_at) : "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <InvestitureStatusBadge
                      status={enrollment.investiture_status}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openHistory(enrollment)}
                      >
                        <Eye className="size-4" />
                        {t("pendingTable.viewDetail")}
                      </Button>

                      {/* Approve — only for SUBMITTED */}
                      {isSubmitted && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-success hover:bg-success/10 hover:text-success"
                              onClick={() =>
                                setDialog({
                                  type: "validate",
                                  enrollment,
                                  action: "APPROVED",
                                })
                              }
                              aria-label={t("pendingTable.ariaApprove")}
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("pendingTable.tooltipApprove")}</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Reject — only for SUBMITTED */}
                      {isSubmitted && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setDialog({
                                  type: "validate",
                                  enrollment,
                                  action: "REJECTED",
                                })
                              }
                              aria-label={t("pendingTable.ariaReject")}
                            >
                              <XCircle className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("pendingTable.tooltipReject")}</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Mark as Investido — only for APPROVED */}
                      {isApproved && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-primary hover:bg-primary/10 hover:text-primary"
                              onClick={() =>
                                setDialog({ type: "investido", enrollment })
                              }
                              aria-label={t("pendingTable.ariaMarkInvested")}
                            >
                              <Award className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("pendingTable.tooltipMarkInvested")}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Validate dialog (approve / reject) */}
      {dialog?.type === "validate" && (
        <ValidateDialog
          open
          enrollmentId={dialog.enrollment.enrollment_id}
          memberName={memberName}
          action={dialog.action}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          onSuccess={() => {
            closeDialog();
            onRefresh();
          }}
        />
      )}

      {/* Investido dialog */}
      {dialog?.type === "investido" && (
        <InvestidoDialog
          open
          enrollmentId={dialog.enrollment.enrollment_id}
          memberName={memberName}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          onSuccess={() => {
            closeDialog();
            onRefresh();
          }}
        />
      )}

      {/* History dialog */}
      <Dialog
        open={dialog?.type === "history"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl">
          <DialogHeader className="border-b border-border/70 px-6 py-5 pr-14">
            <DialogTitle>{t("pendingTable.detailTitle")}</DialogTitle>
            {activeEnrollment && (
              <DialogDescription>
                {memberName} &middot;{" "}
                <InvestitureStatusBadge
                  status={activeEnrollment.investiture_status}
                  className="align-middle"
                />
              </DialogDescription>
            )}
          </DialogHeader>
          <ScrollArea className="h-[min(72vh,calc(100vh-9rem))] w-full">
            <div className="min-w-0 space-y-5 p-6">
              {activeEnrollment && (
                <div className="grid min-w-0 gap-3 overflow-hidden rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("pendingTable.detailMember")}
                  </p>
                  <p className="mt-1 text-sm font-medium">{memberName}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeEnrollment.user?.email ??
                      t("pendingTable.enrollmentFallback", {
                        id: activeEnrollment.enrollment_id,
                      })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("pendingTable.detailClass")}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {activeEnrollment.class?.name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getYearName(activeEnrollment)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("pendingTable.detailClub")}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {activeEnrollment.club?.name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeEnrollment.section?.name ??
                      t("pendingTable.sectionUnknown")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("pendingTable.detailSubmittedBy")}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {getUserName(
                      activeEnrollment.submitted_by,
                      t("pendingTable.unknownSubmitter"),
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getSubmitterRoleLabel(activeEnrollment)}
                  </p>
                </div>
                </div>
              )}

            <div className="min-w-0 space-y-3">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">
                    {t("pendingTable.progressTitle")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {classProgress
                      ? t("pendingTable.progressSummary", {
                          completed: classProgress.completed_sections,
                          total: classProgress.total_sections,
                        })
                      : t("pendingTable.progressDescription")}
                  </p>
                </div>
                {classProgress && (
                  <span className="w-fit shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold tabular-nums">
                    {classProgress.overall_progress}%
                  </span>
                )}
              </div>

              {loadingProgress ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-xl bg-muted"
                    />
                  ))}
                </div>
              ) : classProgress ? (
                <div className="space-y-3">
                  {classProgress.modules.map((module) => (
                    <div
                      key={module.module_id}
                      className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-background p-3"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {module.module_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("pendingTable.moduleSummary", {
                              completed: module.completed_sections,
                              total: module.total_sections,
                            })}
                          </p>
                        </div>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                          {module.progress_percentage}%
                        </span>
                      </div>

                      <div className="space-y-2">
                        {module.sections.map((section) => (
                          <div
                            key={section.section_id}
                            className="min-w-0 overflow-hidden rounded-lg border border-border/60 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                  <CheckCircle2
                                    className={`size-4 shrink-0 ${
                                      section.completed
                                        ? "text-success"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                  <p className="truncate text-sm font-medium">
                                    {section.section_name}
                                  </p>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {getProgressStatusLabel(section.status)}
                                  {section.validated_by_name
                                    ? ` · ${t("pendingTable.validatedBy", {
                                        name: section.validated_by_name,
                                      })}`
                                    : ""}
                                </p>
                              </div>
                              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                                {section.completed
                                  ? "100%"
                                  : `${Math.round(section.score)}%`}
                              </span>
                            </div>

                            {section.evidence_files.length > 0 && (
                              <div className="mt-3 space-y-1.5">
                                {section.evidence_files.map((file) => (
                                  <a
                                    key={file.id}
                                    href={file.file_url ?? "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-md bg-muted/50 px-3 py-2 text-xs transition-colors hover:bg-muted"
                                  >
                                    <span className="flex min-w-0 flex-1 items-center gap-2">
                                      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                                      <span className="min-w-0 truncate font-medium">
                                        {file.file_name}
                                      </span>
                                      {file.uploaded_by_name && (
                                        <span className="hidden max-w-40 shrink-0 truncate text-muted-foreground sm:inline">
                                          · {file.uploaded_by_name}
                                        </span>
                                      )}
                                    </span>
                                    {file.file_url && (
                                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                                    )}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  {t("pendingTable.progressUnavailable")}
                </div>
              )}
            </div>

            <h3 className="mb-3 text-sm font-semibold">
              {t("pendingTable.historyTitle")}
            </h3>
            {loadingHistory ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : (
              <HistoryTimeline entries={historyEntries} />
            )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
