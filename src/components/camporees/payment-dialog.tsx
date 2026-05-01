"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { Resolver, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { createPayment, updatePayment } from "@/lib/api/camporees";
import type { CamporeePayment, CamporeeMember, PaymentType } from "@/lib/api/camporees";

// ─── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  member_id: z.string().min(1, "Seleccione un miembro"),
  amount: z.coerce
    .number()
    .positive("El monto debe ser mayor a cero"),
  payment_type: z.enum(["inscription", "materials", "other"] as const),
  reference: z.string().optional(),
  notes: z.string().optional(),
  paid_at: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Labels ───────────────────────────────────────────────────────────────────

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  inscription: "Inscripción",
  materials: "Materiales",
  other: "Otro",
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporeeId: number;
  members: CamporeeMember[];
  payment?: CamporeePayment | null;
  onSuccess: () => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function toDateInputValue(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentDialog({
  open,
  onOpenChange,
  camporeeId,
  members,
  payment,
  onSuccess,
}: PaymentDialogProps) {
  const t = useTranslations("camporees");
  const isEditing = payment != null;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      member_id: "",
      amount: undefined,
      payment_type: "inscription",
      reference: "",
      notes: "",
      paid_at: "",
    },
  });

  const paymentType = watch("payment_type");
  const memberId = watch("member_id");

  // Pre-fill form when editing
  useEffect(() => {
    if (open && payment) {
      setValue("member_id", payment.member_id);
      setValue("amount", payment.amount);
      setValue("payment_type", payment.payment_type);
      setValue("reference", payment.reference ?? "");
      setValue("notes", payment.notes ?? "");
      setValue("paid_at", toDateInputValue(payment.paid_at));
    } else if (open && !payment) {
      reset({
        member_id: "",
        amount: undefined,
        payment_type: "inscription",
        reference: "",
        notes: "",
        paid_at: "",
      });
    }
  }, [open, payment, reset, setValue]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
    }
    onOpenChange(nextOpen);
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const payloadBase = {
        amount: values.amount,
        payment_type: values.payment_type,
        reference: values.reference || undefined,
        notes: values.notes || undefined,
        paid_at: values.paid_at || undefined,
      };

      if (isEditing && payment) {
        await updatePayment(payment.payment_id, payloadBase);
        toast.success(t("toasts.payment_updated"));
      } else {
        await createPayment(camporeeId, values.member_id, payloadBase);
        toast.success(t("toasts.payment_created"));
      }

      onSuccess();
      handleOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.save_payment");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar pago" : "Registrar pago"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Member */}
          <div className="space-y-1.5">
            <Label>Miembro *</Label>
            {isEditing ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {payment?.member_name ?? payment?.member_id}
              </p>
            ) : (
              <Select
                value={memberId}
                onValueChange={(val) => setValue("member_id", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar miembro" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.name ?? m.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.member_id && (
              <p className="text-xs text-destructive">{errors.member_id.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Monto *</Label>
            <Input
              id="amount"
              type="number"
              min={0.01}
              step={0.01}
              {...register("amount")}
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Payment type */}
          <div className="space-y-1.5">
            <Label>Tipo de pago *</Label>
            <Select
              value={paymentType}
              onValueChange={(val) =>
                setValue("payment_type", val as PaymentType)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_TYPE_LABELS) as PaymentType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PAYMENT_TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.payment_type && (
              <p className="text-xs text-destructive">{errors.payment_type.message}</p>
            )}
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <Label htmlFor="reference">Referencia</Label>
            <Input
              id="reference"
              {...register("reference")}
              placeholder="Ej. TRANS-00123"
            />
          </div>

          {/* Paid at */}
          <div className="space-y-1.5">
            <Label htmlFor="paid_at">Fecha de pago</Label>
            <Input id="paid_at" type="date" {...register("paid_at")} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Observaciones opcionales"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? "Guardando..."
                  : "Registrando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Registrar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
