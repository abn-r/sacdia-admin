"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Award, Loader2 } from "lucide-react";
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
import { markAsInvestido } from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  comments: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvestidoDialogProps {
  open: boolean;
  enrollmentId: number;
  memberName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvestidoDialog({
  open,
  enrollmentId,
  memberName,
  onOpenChange,
  onSuccess,
}: InvestidoDialogProps) {
  const t = useTranslations("investiture");
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { comments: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsPending(true);
    try {
      await markAsInvestido(enrollmentId, {
        comments: values.comments || undefined,
      });

      toast.success(t("toasts.invested_member", { name: memberName }));
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("errors.unexpected");
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
            <Award className="size-5 text-primary" />
            Registrar investidura
          </DialogTitle>
          <DialogDescription>
            Se registrará la investidura de{" "}
            <span className="font-medium text-foreground">{memberName}</span>.
            Esta acción es irreversible y sincronizará el estado en el sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="investido-comments">Comentarios (opcional)</Label>
            <Textarea
              id="investido-comments"
              placeholder="Añade un comentario opcional..."
              rows={3}
              {...form.register("comments")}
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
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirmar investidura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
