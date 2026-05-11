"use client";

import { useState } from "react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTranslations } from "next-intl";
import { registerCamporeeMember } from "@/lib/api/camporees";

// ─── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  user_id: z.string().uuid("El ID de usuario debe ser un UUID válido"),
  camporee_type: z.enum(["local", "union"]),
  club_name: z.string().optional(),
  insurance_id: z.coerce.number().int().positive().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface RegisterMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporeeId: number;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterMemberDialog({
  open,
  onOpenChange,
  camporeeId,
  onSuccess,
}: RegisterMemberDialogProps) {
  const t = useTranslations("camporees");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insuranceError, setInsuranceError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      user_id: "",
      camporee_type: "local",
      club_name: "",
      insurance_id: "",
    },
  });

  const camporeeType = form.watch("camporee_type");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
      setInsuranceError(null);
    }
    onOpenChange(nextOpen);
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    setInsuranceError(null);
    try {
      await registerCamporeeMember(camporeeId, {
        user_id: values.user_id,
        camporee_type: values.camporee_type,
        club_name: values.club_name || undefined,
        insurance_id:
          values.insurance_id !== "" && values.insurance_id != null
            ? Number(values.insurance_id)
            : undefined,
      });
      toast.success(t("toasts.member_registered"));
      onSuccess();
      handleOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.register_member");

      // Insurance-related errors get a dedicated callout
      if (
        message.toLowerCase().includes("seguro") ||
        message.toLowerCase().includes("insurance") ||
        message.toLowerCase().includes("póliza")
      ) {
        setInsuranceError(message);
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("registerMemberDialog.title")}</DialogTitle>
          <DialogDescription>
            Ingresá el UUID del usuario y los datos necesarios para inscribirlo en el camporee.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Insurance error callout */}
            {insuranceError && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              >
                <p className="font-medium">{t("registerMemberDialog.insuranceErrorTitle")}</p>
                <p className="mt-0.5">{insuranceError}</p>
              </div>
            )}

            {/* User ID */}
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("registerMemberDialog.labelUserId")} <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      aria-required="true"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de camporee */}
            <FormField
              control={form.control}
              name="camporee_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("registerMemberDialog.labelCamporeeType")} <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(val) => field.onChange(val as "local" | "union")}
                    >
                      <SelectTrigger aria-required="true">
                        <SelectValue placeholder={t("registerMemberDialog.placeholderCamporeeType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">{t("registerMemberDialog.typeLocal")}</SelectItem>
                        <SelectItem value="union">{t("registerMemberDialog.typeUnion")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Club name (required for union) */}
            <FormField
              control={form.control}
              name="club_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("registerMemberDialog.labelClubName")}
                    {camporeeType === "union" && (
                      <span className="text-muted-foreground"> {t("registerMemberDialog.clubNameRequiredForUnion")}</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("registerMemberDialog.placeholderClubName")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Insurance ID */}
            <FormField
              control={form.control}
              name="insurance_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("registerMemberDialog.labelInsuranceId")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder={t("registerMemberDialog.placeholderInsuranceId")}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("registerMemberDialog.helpInsurance")}
                  </FormDescription>
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
                {t("registerMemberDialog.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("registerMemberDialog.registering") : t("registerMemberDialog.register")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
