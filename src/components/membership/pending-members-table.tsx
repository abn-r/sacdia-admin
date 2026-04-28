"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  UserPlus,
  Clock,
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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/shared/empty-state";
import { MembershipRejectDialog } from "@/components/membership/membership-reject-dialog";
import {
  listMembershipRequestsFromClient,
  approveMembershipRequest,
  type MembershipRequest,
} from "@/lib/api/membership-requests";
import { ApiError } from "@/lib/api/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserName(user?: MembershipRequest["users"]): string {
  if (!user) return "\u2014";
  const parts = [user.name, user.paternal_last_name, user.maternal_last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return user.email ?? "\u2014";
}

function getUserEmail(user?: MembershipRequest["users"]): string {
  return user?.email ?? "\u2014";
}

function formatDate(iso?: string | null): string {
  if (!iso) return "\u2014";
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

function formatDatetime(iso?: string | null): string {
  if (!iso) return "\u2014";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function getRoleName(role?: MembershipRequest["roles"]): string {
  return role?.role_name ?? "miembro";
}

function isExpiringSoon(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt).getTime() - Date.now();
  // Less than 48 hours
  return diff > 0 && diff < 48 * 60 * 60 * 1000;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingMembersTableProps {
  clubSectionId: number;
  initialRequests: MembershipRequest[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PendingMembersTable({
  clubSectionId,
  initialRequests,
}: PendingMembersTableProps) {
  const [requests, setRequests] = useState<MembershipRequest[]>(initialRequests);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<MembershipRequest | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const fresh = await listMembershipRequestsFromClient(clubSectionId);
      setRequests(fresh);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "No se pudo actualizar la lista";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [clubSectionId]);

  const handleApprove = async (req: MembershipRequest) => {
    setProcessingId(req.assignment_id);
    try {
      await approveMembershipRequest(clubSectionId, req.assignment_id);
      toast.success(
        `Membresía aprobada para ${getUserName(req.users)}`,
      );
      await refresh();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Ocurrió un error al aprobar la solicitud";
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{requests.length}</span>{" "}
          {requests.length === 1
            ? "solicitud pendiente"
            : "solicitudes pendientes"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      {/* Empty state */}
      {requests.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="Sin solicitudes pendientes"
          description="No hay solicitudes de membresía pendientes para esta sección."
        />
      ) : (
        /* Table */
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Miembro
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Rol
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fecha solicitud
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Expira
                </TableHead>
                <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => {
                const isProcessing = processingId === req.assignment_id;
                const expiring = isExpiringSoon(req.expires_at);

                return (
                  <TableRow
                    key={req.assignment_id}
                    className="hover:bg-muted/30"
                  >
                    {/* Member info */}
                    <TableCell className="px-3 py-2.5 align-middle">
                      <div className="space-y-0.5">
                        <p className="font-medium leading-none">
                          {getUserName(req.users)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getUserEmail(req.users)}
                        </p>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                      <Badge variant="outline" className="capitalize">
                        {getRoleName(req.roles)}
                      </Badge>
                    </TableCell>

                    {/* Requested date */}
                    <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                      {formatDate(req.created_at)}
                    </TableCell>

                    {/* Expires at */}
                    <TableCell className="px-3 py-2.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        {expiring && (
                          <Clock className="size-3.5 text-warning" />
                        )}
                        <span
                          className={`text-sm tabular-nums ${
                            expiring
                              ? "font-medium text-warning"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatDatetime(req.expires_at)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-3 py-2.5 align-middle">
                      <div className="flex items-center justify-end gap-1">
                        {isProcessing && (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-success hover:bg-success/10 hover:text-success"
                              onClick={() => handleApprove(req)}
                              disabled={isProcessing || isRefreshing}
                              aria-label="Aprobar membresía"
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
                              onClick={() => setRejectDialog(req)}
                              disabled={isProcessing || isRefreshing}
                              aria-label="Rechazar membresía"
                            >
                              <XCircle className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rechazar</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reject dialog */}
      {rejectDialog && (
        <MembershipRejectDialog
          open
          clubSectionId={clubSectionId}
          request={rejectDialog}
          onOpenChange={(open) => {
            if (!open) setRejectDialog(null);
          }}
          onSuccess={() => {
            setRejectDialog(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
