"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTranslations } from "next-intl";
import { createPayment, updatePayment } from "@/lib/api/camporees";
import type { CamporeePayment, CamporeeMember, PaymentType } from "@/lib/api/camporees";

// ─── Schema factory ────────────────────────────────────────────────────────────

function buildSchema(t: ReturnType<typeof useTranslations<"camporees.validation">>) {
  return z.object({
    member_id: z.string().min(1, t("member_required")),
    amount: z.coerce
      .number()
      .positive(t("amount_positive")),
    payment_type: z.enum(["inscription", "materials", "other"] as const),
    reference: z.string().optional(),
    notes: z.string().optional(),
    paid_at: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

// ─── Labels ───────────────────────────────────────────────────────────────────

// Kept for fallback; actual rendering uses t() at call sites
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
  const tVal = useTranslations("camporees.validation");
  const isEditing = payment != null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const schema = useMemo(() => buildSchema(tVal), [tVal]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      member_id: "",
      amount: undefined,
      payment_type: "inscription",
      reference: "",
      notes: "",
      paid_at: "",
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (open && payment) {
      form.setValue("member_id", payment.member_id);
      form.setValue("amount", payment.amount);
      form.setValue("payment_type", payment.payment_type);
      form.setValue("reference", payment.reference ?? "");
      form.setValue("notes", payment.notes ?? "");
      form.setValue("paid_at", toDateInputValue(payment.paid_at));
    } else if (open && !payment) {
      form.reset({
        member_id: "",
        amount: undefined,
        payment_type: "inscription",
        reference: "",
        notes: "",
        paid_at: "",
      });
    }
  }, [open, payment, form]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
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
            {isEditing ? t("paymentDialog.titleEdit") : t("paymentDialog.titleCreate")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modificá los datos del pago registrado."
              : "Registrá un nuevo pago para un participante del camporee."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Member */}
            <FormField
              control={form.control}
              name="member_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("paymentDialog.labelMember")} <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    {isEditing ? (
                      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                        {payment?.member_name ?? payment?.member_id}
                      </p>
                    ) : (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger aria-required="true">
                          <SelectValue placeholder={t("paymentDialog.placeholderMember")} />
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("paymentDialog.labelAmount")} <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      aria-required="true"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment type */}
            <FormField
              control={form.control}
              name="payment_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("paymentDialog.labelPaymentType")} <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(val) => field.onChange(val as PaymentType)}
                    >
                      <SelectTrigger aria-required="true">
                        <SelectValue placeholder={t("paymentDialog.placeholderPaymentType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PAYMENT_TYPE_LABELS) as PaymentType[]).map((key) => {
                          const typeLabels: Record<PaymentType, string> = {
                            inscription: t("paymentDialog.paymentTypeInscription"),
                            materials: t("paymentDialog.paymentTypeMaterials"),
                            other: t("paymentDialog.paymentTypeOther"),
                          };
                          return (
                            <SelectItem key={key} value={key}>
                              {typeLabels[key]}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reference */}
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentDialog.labelReference")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("paymentDialog.placeholderReference")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Paid at */}
            <FormField
              control={form.control}
              name="paid_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentDialog.labelPaidAt")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentDialog.labelNotes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("paymentDialog.placeholderNotes")}
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("paymentDialog.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isEditing
                    ? t("paymentDialog.saving")
                    : t("paymentDialog.registering")
                  : isEditing
                    ? t("paymentDialog.saveChanges")
                    : t("paymentDialog.registerPayment")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
