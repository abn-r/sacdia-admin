"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitApprovalDecisionAction } from "@/lib/admin-users/actions";
import { useTranslations } from "next-intl";

function SubmitButton({ variant }: { variant: "approve" | "reject" }) {
  const t = useTranslations("users");
  const { pending } = useFormStatus();
  const isApprove = variant === "approve";

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={isApprove ? "default" : "destructive"}
    >
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      {isApprove ? t("approval.actionApprove") : t("approval.actionReject")}
    </Button>
  );
}

interface UserApprovalActionsProps {
  userId: string;
  currentApproval: number | string | boolean | null | undefined;
}

export function UserApprovalActions({ userId, currentApproval }: UserApprovalActionsProps) {
  const t = useTranslations("users");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");

  const isPending =
    currentApproval === null ||
    currentApproval === undefined ||
    currentApproval === 0 ||
    currentApproval === "pending";

  const isApproved =
    currentApproval === 1 ||
    currentApproval === true ||
    currentApproval === "approved";

  const isRejected =
    currentApproval === -1 ||
    currentApproval === "rejected";

  if (!isPending) {
    return (
      <div className="mt-1">
        {isApproved && (
          <Badge variant="success" className="gap-1.5">
            <CheckCircle className="size-3.5" />
            {t("approval.statusApproved")}
          </Badge>
        )}
        {isRejected && (
          <Badge variant="destructive" className="gap-1.5">
            <XCircle className="size-3.5" />
            {t("approval.statusRejected")}
          </Badge>
        )}
        {!isApproved && !isRejected && (
          <Badge variant="outline" className="text-muted-foreground">
            {t("approval.statusUnknown")}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            setDecision("approve");
            setDialogOpen(true);
          }}
        >
          <CheckCircle className="mr-2 size-4" />
          {t("approval.actionApprove")}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            setDecision("reject");
            setDialogOpen(true);
          }}
        >
          <XCircle className="mr-2 size-4" />
          {t("approval.actionReject")}
        </Button>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision === "approve"
                ? t("approval.dialogApproveTitle")
                : t("approval.dialogRejectTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decision === "approve"
                ? t("approval.dialogApproveDescription")
                : t("approval.dialogRejectDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form action={submitApprovalDecisionAction}>
            <input type="hidden" name="user_id" value={userId} />
            <input type="hidden" name="decision" value={decision} />

            {decision === "reject" && (
              <div className="mb-4 space-y-2">
                <Label htmlFor="reason">{t("approval.rejectReasonLabel")}</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder={t("approval.rejectReasonPlaceholder")}
                  rows={3}
                />
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel>{t("approval.cancelButton")}</AlertDialogCancel>
              <SubmitButton variant={decision} />
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
