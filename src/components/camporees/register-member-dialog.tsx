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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface RegisterMemberDialogProps {
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      user_id: "",
      camporee_type: "local",
      club_name: "",
      insurance_id: "",
    },
  });

  const camporeeType = watch("camporee_type");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
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

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
          <div className="space-y-1.5">
            <Label htmlFor="user_id">
              {t("registerMemberDialog.labelUserId")} <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Input
              id="user_id"
              aria-required="true"
              {...register("user_id")}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-sm"
            />
            {errors.user_id && (
              <p className="text-xs text-destructive">
                {errors.user_id.message}
              </p>
            )}
          </div>

          {/* Tipo de camporee */}
          <div className="space-y-1.5">
            <Label htmlFor="camporee_type">
              {t("registerMemberDialog.labelCamporeeType")} <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Select
              value={camporeeType}
              onValueChange={(val) =>
                setValue("camporee_type", val as "local" | "union")
              }
            >
              <SelectTrigger id="camporee_type" aria-required="true">
                <SelectValue placeholder={t("registerMemberDialog.placeholderCamporeeType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">{t("registerMemberDialog.typeLocal")}</SelectItem>
                <SelectItem value="union">{t("registerMemberDialog.typeUnion")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.camporee_type && (
              <p className="text-xs text-destructive">
                {errors.camporee_type.message}
              </p>
            )}
          </div>

          {/* Club name (required for union) */}
          <div className="space-y-1.5">
            <Label htmlFor="club_name">
              {t("registerMemberDialog.labelClubName")}
              {camporeeType === "union" && (
                <span className="text-muted-foreground"> {t("registerMemberDialog.clubNameRequiredForUnion")}</span>
              )}
            </Label>
            <Input
              id="club_name"
              {...register("club_name")}
              placeholder={t("registerMemberDialog.placeholderClubName")}
            />
          </div>

          {/* Insurance ID */}
          <div className="space-y-1.5">
            <Label htmlFor="insurance_id">{t("registerMemberDialog.labelInsuranceId")}</Label>
            <Input
              id="insurance_id"
              type="number"
              min={1}
              {...register("insurance_id")}
              placeholder={t("registerMemberDialog.placeholderInsuranceId")}
            />
            <p className="text-xs text-muted-foreground">
              {t("registerMemberDialog.helpInsurance")}
            </p>
            {errors.insurance_id && (
              <p className="text-xs text-destructive">
                {errors.insurance_id.message}
              </p>
            )}
          </div>

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
      </DialogContent>
    </Dialog>
  );
}
