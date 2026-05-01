"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { validateEnrollment, type Enrollment, type InvestitureStatus } from "@/lib/api/enrollments";
import { ApiError } from "@/lib/api/client";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<InvestitureStatus, string> = {
  IN_PROGRESS: "En progreso",
  SUBMITTED_FOR_VALIDATION: "Pendiente validación",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  INVESTIDO: "Investido",
};

type BadgeVariant = "default" | "secondary" | "success" | "destructive" | "warning" | "outline";

const STATUS_VARIANTS: Record<InvestitureStatus, BadgeVariant> = {
  IN_PROGRESS: "secondary",
  SUBMITTED_FOR_VALIDATION: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  INVESTIDO: "default",
};

function StatusBadge({ status }: { status: InvestitureStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

// ─── User display name helper ─────────────────────────────────────────────────

function resolveFullName(enrollment: Enrollment): string {
  const user = enrollment.user;
  if (!user) return "—";

  const parts = [
    user.name ?? user.first_name,
    user.paternal_last_name ?? user.last_name,
    user.maternal_last_name,
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(" ");
  return user.email ?? "—";
}

function resolveEmail(enrollment: Enrollment): string {
  return enrollment.user?.email ?? "—";
}

function resolveClassName(enrollment: Enrollment): string {
  return enrollment.class?.name ?? enrollment.classes?.name ?? "—";
}

function resolveDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ─── Reject confirmation dialog ───────────────────────────────────────────────

interface RejectDialogProps {
  enrollmentId: number;
  disabled: boolean;
  onConfirm: (enrollmentId: number) => void;
}

function RejectDialog({ enrollmentId, disabled, onConfirm }: RejectDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <XCircle className="mr-1.5 size-3.5" />
          Rechazar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rechazar inscripción</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción marcará la inscripción como rechazada. El miembro no
            podra continuar con el proceso de investidura con esta inscripcion.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(enrollmentId)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirmar rechazo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main table component ─────────────────────────────────────────────────────

interface EnrollmentsTableProps {
  enrollments: Enrollment[];
  onRefresh?: () => void;
}

export function EnrollmentsTable({ enrollments, onRefresh }: EnrollmentsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const handleAction = async (
    enrollmentId: number,
    action: "APPROVED" | "REJECTED",
  ) => {
    setProcessingId(enrollmentId);
    try {
      await validateEnrollment(enrollmentId, action);
      toast.success(
        action === "APPROVED"
          ? "Inscripcion aprobada correctamente."
          : "Inscripcion rechazada correctamente.",
      );
      startTransition(() => {
        router.refresh();
        onRefresh?.();
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Ocurrio un error. Intenta de nuevo.";
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  if (enrollments.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Miembro</TableHead>
              <TableHead>Clase</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha inscripcion</TableHead>
              <TableHead>Enviado el</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                No hay inscripciones para mostrar.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Miembro</TableHead>
            <TableHead>Clase</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha inscripcion</TableHead>
            <TableHead>Enviado el</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((enrollment) => {
            const isProcessing = processingId === enrollment.enrollment_id;
            const isPendingValidation =
              enrollment.investiture_status === "SUBMITTED_FOR_VALIDATION";

            return (
              <TableRow key={enrollment.enrollment_id}>
                {/* Member */}
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-medium leading-none">
                      {resolveFullName(enrollment)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resolveEmail(enrollment)}
                    </p>
                  </div>
                </TableCell>

                {/* Class */}
                <TableCell>
                  <span className="text-sm">{resolveClassName(enrollment)}</span>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <StatusBadge status={enrollment.investiture_status} />
                </TableCell>

                {/* Enrollment date */}
                <TableCell className="text-sm text-muted-foreground">
                  {resolveDate(enrollment.enrollment_date)}
                </TableCell>

                {/* Submitted at */}
                <TableCell className="text-sm text-muted-foreground">
                  {resolveDate(enrollment.submitted_at)}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {isProcessing && (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}

                    {/* View user profile — only if user_id is available */}
                    {enrollment.user?.user_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        disabled={isProcessing || isPending}
                      >
                        <a href={`/dashboard/users/${enrollment.user.user_id}`}>
                          <Eye className="mr-1.5 size-3.5" />
                          Ver usuario
                        </a>
                      </Button>
                    )}

                    {/* Approve / Reject — only for pending validation */}
                    {isPendingValidation && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          disabled={isProcessing || isPending}
                          onClick={() =>
                            handleAction(enrollment.enrollment_id, "APPROVED")
                          }
                        >
                          <CheckCircle className="mr-1.5 size-3.5" />
                          Aprobar
                        </Button>

                        <RejectDialog
                          enrollmentId={enrollment.enrollment_id}
                          disabled={isProcessing || isPending}
                          onConfirm={(id) => handleAction(id, "REJECTED")}
                        />
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
  );
}
