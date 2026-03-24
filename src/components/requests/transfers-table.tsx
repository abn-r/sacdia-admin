"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ArrowRightLeft } from "lucide-react";
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
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { RequestReviewDialog } from "@/components/requests/request-review-dialog";
import {
  reviewTransferRequest,
  type TransferRequest,
  type ReviewAction,
  type ReviewRequestPayload,
} from "@/lib/api/requests";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserName(user?: TransferRequest["requester"]): string {
  if (!user) return "—";
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return full || user.email || "—";
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

type DialogState = {
  request: TransferRequest;
  action: ReviewAction;
} | null;

interface TransfersTableProps {
  requests: TransferRequest[];
  onRefresh: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransfersTable({ requests, onRefresh }: TransfersTableProps) {
  const [dialog, setDialog] = useState<DialogState>(null);

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={ArrowRightLeft}
        title="Sin solicitudes"
        description="No hay solicitudes de transferencia en este estado."
      />
    );
  }

  const activeRequest = dialog?.request ?? null;
  const requesterName = activeRequest ? getUserName(activeRequest.requester) : "";

  async function handleReview(payload: ReviewRequestPayload) {
    if (!activeRequest) return;
    await reviewTransferRequest(activeRequest.request_id, payload);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Solicitante
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Desde
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Hacia
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Motivo
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Fecha
              </TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => {
              const isPending = req.status === "PENDING";
              return (
                <TableRow key={String(req.request_id)} className="hover:bg-muted/30">
                  <TableCell className="px-3 py-2.5 align-middle font-medium">
                    {getUserName(req.requester)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {req.from_section?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {req.to_section?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle max-w-48">
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {req.reason ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <RequestStatusBadge status={req.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                    {formatDate(req.created_at)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {isPending && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-success hover:bg-success/10 hover:text-success"
                                onClick={() => setDialog({ request: req, action: "approved" })}
                                aria-label="Aprobar transferencia"
                              >
                                <CheckCircle2 className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Aprobar</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDialog({ request: req, action: "rejected" })}
                                aria-label="Rechazar transferencia"
                              >
                                <XCircle className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Rechazar</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {dialog && (
        <RequestReviewDialog
          open
          action={dialog.action}
          title={
            dialog.action === "approved"
              ? "Aprobar transferencia"
              : "Rechazar transferencia"
          }
          description={
            dialog.action === "approved"
              ? `Se aprobará la solicitud de transferencia de ${requesterName}.`
              : `Se rechazará la solicitud de ${requesterName}. El motivo es obligatorio.`
          }
          onOpenChange={(open) => { if (!open) setDialog(null); }}
          onSubmit={handleReview}
          onSuccess={() => { setDialog(null); onRefresh(); }}
        />
      )}
    </>
  );
}
