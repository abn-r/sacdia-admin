"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, History, ClipboardList } from "lucide-react";
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
import { EmptyState } from "@/components/shared/empty-state";
import { ValidationStatusBadge } from "@/components/validation/validation-status-badge";
import { ValidationReviewDialog } from "@/components/validation/validation-review-dialog";
import { ValidationHistoryDialog } from "@/components/validation/validation-history-dialog";
import type {
  PendingValidation,
  ValidationAction,
  ValidationEntityType,
} from "@/lib/api/validation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberName(v: PendingValidation): string {
  const u = v.user;
  if (!u) return `Validación #${String(v.validation_id)}`;
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.email || `Validación #${String(v.validation_id)}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogState =
  | { type: "review"; validation: PendingValidation; action: ValidationAction }
  | { type: "history"; validation: PendingValidation }
  | null;

interface ValidationTableProps {
  validations: PendingValidation[];
  entityType: ValidationEntityType;
  onRefresh: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ValidationTable({
  validations,
  entityType,
  onRefresh,
}: ValidationTableProps) {
  const [dialog, setDialog] = useState<DialogState>(null);

  function closeDialog() {
    setDialog(null);
  }

  if (validations.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Sin pendientes"
        description="No hay validaciones pendientes en este momento."
      />
    );
  }

  const activeValidation = dialog?.validation ?? null;
  const memberName = activeValidation ? getMemberName(activeValidation) : "";
  const entityName = activeValidation?.entity?.name ?? "—";

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
                {entityType === "class" ? "Clase" : "Especialidad"}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sección
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
            {validations.map((v) => {
              const name = getMemberName(v);
              const isPending = v.status === "PENDING";

              return (
                <TableRow key={String(v.validation_id)} className="hover:bg-muted/30">
                  <TableCell className="px-3 py-2.5 align-middle">
                    <span className="font-medium">{name}</span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {v.entity?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {v.section?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                    {formatDate(v.submitted_at)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <ValidationStatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {/* History */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDialog({ type: "history", validation: v })}
                            aria-label="Ver historial"
                          >
                            <History className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver historial</TooltipContent>
                      </Tooltip>

                      {/* Approve — only for PENDING */}
                      {isPending && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-success hover:bg-success/10 hover:text-success"
                              onClick={() =>
                                setDialog({ type: "review", validation: v, action: "APPROVED" })
                              }
                              aria-label="Aprobar"
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Aprobar</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Reject — only for PENDING */}
                      {isPending && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setDialog({ type: "review", validation: v, action: "REJECTED" })
                              }
                              aria-label="Rechazar"
                            >
                              <XCircle className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rechazar</TooltipContent>
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

      {/* Review dialog (approve / reject) */}
      {dialog?.type === "review" && (
        <ValidationReviewDialog
          open
          entityType={entityType}
          entityId={dialog.validation.entity_id}
          memberName={memberName}
          entityName={entityName}
          action={dialog.action}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
          onSuccess={() => { closeDialog(); onRefresh(); }}
        />
      )}

      {/* History dialog */}
      {dialog?.type === "history" && (
        <ValidationHistoryDialog
          open
          entityType={entityType}
          entityId={dialog.validation.entity_id}
          title={`${entityName} — ${memberName}`}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
        />
      )}
    </>
  );
}
