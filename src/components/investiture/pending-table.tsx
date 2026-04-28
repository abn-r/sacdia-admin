"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Award, History, ClipboardList } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/empty-state";
import { InvestitureStatusBadge } from "@/components/investiture/investiture-status-badge";
import { ValidateDialog } from "@/components/investiture/validate-dialog";
import { InvestidoDialog } from "@/components/investiture/investido-dialog";
import { HistoryTimeline } from "@/components/investiture/history-timeline";
import {
  getInvestitureHistory,
  type PendingEnrollment,
  type InvestitureHistoryEntry,
  type ValidateAction,
} from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberName(enrollment: PendingEnrollment): string {
  const u = enrollment.user;
  if (!u) return `Inscripción #${enrollment.enrollment_id}`;
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.email || `Inscripción #${enrollment.enrollment_id}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
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
  const [dialog, setDialog] = useState<DialogState>(null);
  const [historyEntries, setHistoryEntries] = useState<InvestitureHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function openHistory(enrollment: PendingEnrollment) {
    setDialog({ type: "history", enrollment });
    setLoadingHistory(true);
    setHistoryEntries([]);
    try {
      const entries = await getInvestitureHistory(enrollment.enrollment_id);
      setHistoryEntries(Array.isArray(entries) ? entries : []);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "No se pudo cargar el historial";
      toast.error(message);
    } finally {
      setLoadingHistory(false);
    }
  }

  function closeDialog() {
    setDialog(null);
    setHistoryEntries([]);
  }

  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Sin pendientes"
        description="No hay investiduras pendientes de validación en este momento."
      />
    );
  }

  const activeEnrollment = dialog?.enrollment ?? null;
  const memberName = activeEnrollment ? getMemberName(activeEnrollment) : "";

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Miembro
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Clase
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Club
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Enviado
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => {
              const name = getMemberName(enrollment);
              const isSubmitted =
                enrollment.investiture_status === "SUBMITTED_FOR_VALIDATION";
              const isApproved = enrollment.investiture_status === "APPROVED";

              return (
                <TableRow
                  key={enrollment.enrollment_id}
                  className="hover:bg-muted/30"
                >
                  <TableCell className="px-3 py-2.5 align-middle">
                    <span className="font-medium">{name}</span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {enrollment.class?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {enrollment.club?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                    {formatDate(enrollment.submitted_at)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <InvestitureStatusBadge
                      status={enrollment.investiture_status}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {/* History button — always visible */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openHistory(enrollment)}
                            aria-label="Ver historial"
                          >
                            <History className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver historial</TooltipContent>
                      </Tooltip>

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
                              aria-label="Aprobar"
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Aprobar</TooltipContent>
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
                              aria-label="Rechazar"
                            >
                              <XCircle className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rechazar</TooltipContent>
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
                              aria-label="Marcar como investido"
                            >
                              <Award className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Marcar como investido</TooltipContent>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Historial de investidura</DialogTitle>
            {activeEnrollment && (
              <p className="text-sm text-muted-foreground">
                {memberName} &middot;{" "}
                <InvestitureStatusBadge
                  status={activeEnrollment.investiture_status}
                  className="align-middle"
                />
              </p>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-96 pr-2">
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
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
