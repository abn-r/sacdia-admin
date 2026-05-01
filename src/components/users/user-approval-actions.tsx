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

function SubmitButton({ variant }: { variant: "approve" | "reject" }) {
  const { pending } = useFormStatus();
  const isApprove = variant === "approve";

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={isApprove ? "default" : "destructive"}
    >
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      {isApprove ? "Aprobar" : "Rechazar"}
    </Button>
  );
}

interface UserApprovalActionsProps {
  userId: string;
  currentApproval: number | string | boolean | null | undefined;
}

export function UserApprovalActions({ userId, currentApproval }: UserApprovalActionsProps) {
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
            Aprobado
          </Badge>
        )}
        {isRejected && (
          <Badge variant="destructive" className="gap-1.5">
            <XCircle className="size-3.5" />
            Rechazado
          </Badge>
        )}
        {!isApproved && !isRejected && (
          <Badge variant="outline" className="text-muted-foreground">
            Estado desconocido
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
          Aprobar
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
          Rechazar
        </Button>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision === "approve" ? "¿Aprobar usuario?" : "¿Rechazar usuario?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decision === "approve"
                ? "El usuario será aprobado y podrá acceder al sistema."
                : "El usuario será rechazado. Puedes incluir una razón."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form action={submitApprovalDecisionAction}>
            <input type="hidden" name="user_id" value={userId} />
            <input type="hidden" name="decision" value={decision} />

            {decision === "reject" && (
              <div className="mb-4 space-y-2">
                <Label htmlFor="reason">Razón del rechazo (opcional)</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder="Describe la razón del rechazo..."
                  rows={3}
                />
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <SubmitButton variant={decision} />
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
