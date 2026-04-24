"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import { approveEvidence, type EvidenceType } from "@/lib/api/evidence-review";
import { ApiError } from "@/lib/api/client";

interface EvidenceApproveDialogProps {
  open: boolean;
  type: EvidenceType;
  id: number;
  memberName: string;
  sectionName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EvidenceApproveDialog({
  open,
  type,
  id,
  memberName,
  sectionName,
  onOpenChange,
  onSuccess,
}: EvidenceApproveDialogProps) {
  const t = useTranslations("evidence_review");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState("");

  async function handleApprove() {
    setIsSubmitting(true);
    try {
      await approveEvidence(type, id, comments.trim() || undefined);
      toast.success(t("toasts.evidence_approved"));
      setComments("");
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("errors.approve");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose(isOpen: boolean) {
    if (!isSubmitting) {
      setComments("");
      onOpenChange(isOpen);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-success" />
            Aprobar evidencia
          </DialogTitle>
          <DialogDescription>
            Vas a aprobar la evidencia de{" "}
            <span className="font-medium text-foreground">{memberName}</span> para{" "}
            <span className="font-medium text-foreground">{sectionName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="approve-comments">Comentario (opcional)</Label>
          <Textarea
            id="approve-comments"
            placeholder="Comentario para el miembro..."
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={isSubmitting}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">{comments.length}/500 caracteres</p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Aprobar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
