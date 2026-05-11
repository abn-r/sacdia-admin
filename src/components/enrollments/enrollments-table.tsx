"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { useFormatDate } from "@/lib/format-locale";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";

// ─── Status badge ─────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "success" | "destructive" | "warning" | "outline";

const STATUS_VARIANTS: Record<InvestitureStatus, BadgeVariant> = {
  IN_PROGRESS: "secondary",
  SUBMITTED_FOR_VALIDATION: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  INVESTIDO: "default",
};

function StatusBadge({ status, label }: { status: InvestitureStatus; label: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {label}
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

// ─── Reject confirmation dialog ───────────────────────────────────────────────

interface RejectDialogProps {
  enrollmentId: number;
  disabled: boolean;
  onConfirm: (enrollmentId: number) => void;
}

function RejectDialog({ enrollmentId, disabled, onConfirm }: RejectDialogProps) {
  const t = useTranslations("enrollments");
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <XCircle className="mr-1.5 size-3.5" />
          {t("actions.reject")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("actions.reject_dialog_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("actions.reject_dialog_description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.reject_dialog_cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(enrollmentId)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("actions.reject_dialog_confirm")}
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
  const t = useTranslations("enrollments");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const formatDate = useFormatDate();

  const handleAction = async (
    enrollmentId: number,
    action: "APPROVED" | "REJECTED",
  ) => {
    setProcessingId(enrollmentId);
    try {
      await validateEnrollment(enrollmentId, action);
      toast.success(
        action === "APPROVED"
          ? t("toasts.approved")
          : t("toasts.rejected"),
      );
      startTransition(() => {
        router.refresh();
        onRefresh?.();
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("errors.generic");
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
              <TableHead>{t("table.col_member")}</TableHead>
              <TableHead>{t("table.col_class")}</TableHead>
              <TableHead>{t("table.col_status")}</TableHead>
              <TableHead>{t("table.col_enrollment_date")}</TableHead>
              <TableHead>{t("table.col_submitted_at")}</TableHead>
              <TableHead className="text-right">{t("table.col_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                {t("table.empty")}
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
            <TableHead>{t("table.col_member")}</TableHead>
            <TableHead>{t("table.col_class")}</TableHead>
            <TableHead>{t("table.col_status")}</TableHead>
            <TableHead>{t("table.col_enrollment_date")}</TableHead>
            <TableHead>{t("table.col_submitted_at")}</TableHead>
            <TableHead className="text-right">{t("table.col_actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((enrollment, index) => {
            const isProcessing = processingId === enrollment.enrollment_id;
            const isPendingValidation =
              enrollment.investiture_status === "SUBMITTED_FOR_VALIDATION";

            return (
              <TableRow key={enrollment.enrollment_id} className={STAGGER_CLASSES} style={getStaggerStyle(index)}>
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
                  <StatusBadge
                    status={enrollment.investiture_status}
                    label={t(`table.status.${enrollment.investiture_status}`)}
                  />
                </TableCell>

                {/* Enrollment date */}
                <TableCell className="text-sm text-muted-foreground">
                  {enrollment.enrollment_date ? formatDate(enrollment.enrollment_date) : "—"}
                </TableCell>

                {/* Submitted at */}
                <TableCell className="text-sm text-muted-foreground">
                  {enrollment.submitted_at ? formatDate(enrollment.submitted_at) : "—"}
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
                          {t("actions.view_user")}
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
                          {t("actions.approve")}
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
