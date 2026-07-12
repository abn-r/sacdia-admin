"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
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
import {
  approveEnrollment,
  rejectEnrollment,
  type Enrollment,
  type EnrollmentStatus,
} from "@/lib/api/enrollments";
import { ApiError } from "@/lib/api/client";
import { useFormatDate } from "@/lib/format-locale";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";

// ─── Status badge ─────────────────────────────────────────────────────────────

type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "destructive"
  | "warning"
  | "outline";

const STATUS_VARIANTS: Record<EnrollmentStatus, BadgeVariant> = {
  pending_validation: "warning",
  active: "success",
  rejected: "destructive",
  inactive: "secondary",
};

function StatusBadge({
  status,
  label,
}: {
  status: EnrollmentStatus;
  label: string;
}) {
  return <Badge variant={STATUS_VARIANTS[status]}>{label}</Badge>;
}

function display(value?: string | null): string {
  return value && value.trim().length > 0 ? value : "—";
}

function leadershipSummary(enrollment: Enrollment): string {
  const leaders = [
    enrollment.director?.name,
    enrollment.secretary_treasurer?.name,
    enrollment.secretary?.name,
    enrollment.treasurer?.name,
  ].filter(Boolean);
  return leaders.length > 0 ? leaders.join(" · ") : "—";
}

// ─── Reject confirmation dialog ───────────────────────────────────────────────

interface RejectDialogProps {
  enrollmentId: string;
  disabled: boolean;
  onConfirm: (enrollmentId: string) => void;
}

function RejectDialog({
  enrollmentId,
  disabled,
  onConfirm,
}: RejectDialogProps) {
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
          <AlertDialogTitle>
            {t("actions.reject_dialog_title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("actions.reject_dialog_description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t("actions.reject_dialog_cancel")}
          </AlertDialogCancel>
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

export function EnrollmentsTable({
  enrollments,
  onRefresh,
}: EnrollmentsTableProps) {
  const t = useTranslations("enrollments");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const formatDate = useFormatDate();

  const handleAction = async (
    enrollmentId: string,
    action: "approved" | "rejected",
  ) => {
    setProcessingId(enrollmentId);
    try {
      if (action === "approved") {
        await approveEnrollment(enrollmentId);
      } else {
        await rejectEnrollment(enrollmentId);
      }
      toast.success(
        action === "approved" ? t("toasts.approved") : t("toasts.rejected"),
      );
      startTransition(() => {
        router.refresh();
        onRefresh?.();
      });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("errors.generic");
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
              <TableHead>{t("table.col_club")}</TableHead>
              <TableHead>{t("table.col_section")}</TableHead>
              <TableHead>{t("table.col_local_field")}</TableHead>
              <TableHead>{t("table.col_status")}</TableHead>
              <TableHead>{t("table.col_submitted_at")}</TableHead>
              <TableHead className="text-right">
                {t("table.col_actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-32 text-center text-muted-foreground"
              >
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
            <TableHead>{t("table.col_club")}</TableHead>
            <TableHead>{t("table.col_section")}</TableHead>
            <TableHead>{t("table.col_local_field")}</TableHead>
            <TableHead>{t("table.col_status")}</TableHead>
            <TableHead>{t("table.col_submitted_at")}</TableHead>
            <TableHead>{t("table.col_leadership")}</TableHead>
            <TableHead className="text-right">
              {t("table.col_actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((enrollment, index) => {
            const isProcessing = processingId === enrollment.club_enrollment_id;
            const canReview = enrollment.status === "pending_validation";

            return (
              <TableRow
                key={enrollment.club_enrollment_id}
                className={STAGGER_CLASSES}
                style={getStaggerStyle(index)}
              >
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-medium leading-none">
                      {display(enrollment.club?.name)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {display(enrollment.created_by?.name)}
                    </p>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {display(enrollment.section?.name)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {display(enrollment.ecclesiastical_year?.name)}
                    </p>
                  </div>
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {display(enrollment.local_field?.name)}
                </TableCell>

                <TableCell>
                  <StatusBadge
                    status={enrollment.status}
                    label={t(`table.status.${enrollment.status}`)}
                  />
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {enrollment.created_at
                    ? formatDate(enrollment.created_at)
                    : "—"}
                </TableCell>

                <TableCell className="max-w-xs text-sm text-muted-foreground">
                  {leadershipSummary(enrollment)}
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {isProcessing && (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}

                    <Button
                      variant="default"
                      size="sm"
                      disabled={!canReview || isProcessing || isPending}
                      onClick={() =>
                        handleAction(enrollment.club_enrollment_id, "approved")
                      }
                    >
                      <CheckCircle className="mr-1.5 size-3.5" />
                      {t("actions.approve")}
                    </Button>

                    <RejectDialog
                      enrollmentId={enrollment.club_enrollment_id}
                      disabled={!canReview || isProcessing || isPending}
                      onConfirm={(id) => handleAction(id, "rejected")}
                    />
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
