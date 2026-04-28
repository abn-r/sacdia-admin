"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { XCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  rejectMembershipRequest,
  type MembershipRequest,
} from "@/lib/api/membership-requests";

// ─── Schema ───────────────────────────────────────────────────────────────────

const rejectSchema = z.object({
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof rejectSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserName(user?: MembershipRequest["users"]): string {
  if (!user) return "este usuario";
  const parts = [user.name, user.paternal_last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.email ?? "este usuario";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MembershipRejectDialogProps {
  open: boolean;
  clubSectionId: number;
  request: MembershipRequest;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembershipRejectDialog({
  open,
  clubSectionId,
  request,
  onOpenChange,
  onSuccess,
}: MembershipRejectDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const userName = getUserName(request.users);

  const form = useForm<FormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsPending(true);
    try {
      await rejectMembershipRequest(
        clubSectionId,
        request.assignment_id,
        values.reason || undefined,
      );

      toast.success(`Solicitud de membresía rechazada para ${userName}`);
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Ocurrió un error al rechazar la solicitud";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  });

  function handleClose(isOpen: boolean) {
    if (!isPending) {
      form.reset();
      onOpenChange(isOpen);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="size-5 text-destructive" />
            Rechazar solicitud de membresía
          </DialogTitle>
          <DialogDescription>
            Se rechazará la solicitud de membresía de{" "}
            <span className="font-medium text-foreground">{userName}</span>.
            Opcionalmente puedes indicar un motivo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo de rechazo (opcional)</Label>
            <Textarea
              id="reject-reason"
              placeholder="Describe el motivo del rechazo..."
              rows={3}
              {...form.register("reason")}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Rechazar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
