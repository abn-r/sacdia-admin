"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";
import { createCamporee, updateCamporee } from "@/lib/api/camporees";
import type { Camporee } from "@/lib/api/camporees";

// ─── Schema factory ────────────────────────────────────────────────────────────

function buildSchema(t: ReturnType<typeof useTranslations<"camporees.validation">>) {
  return z
    .object({
      name: z.string().min(1, t("name_required")),
      description: z.string().optional(),
      start_date: z.string().min(1, t("start_date_required")),
      end_date: z.string().min(1, t("end_date_required")),
      local_camporee_place: z.string().min(1, t("place_required")),
      local_field_id: z.coerce.number().int().min(1, t("local_field_required")),
      registration_cost: z.coerce.number().min(0).optional(),
      includes_adventurers: z.boolean(),
      includes_pathfinders: z.boolean(),
      includes_master_guides: z.boolean(),
    })
    .refine((data) => data.start_date <= data.end_date, {
      message: t("end_date_after_start_full"),
      path: ["end_date"],
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CamporeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporee?: Camporee | null;
  onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(dateStr?: string | null): string {
  if (!dateStr) return "";
  // Accepts ISO strings like "2024-05-15T00:00:00.000Z" or "2024-05-15"
  return dateStr.split("T")[0] ?? "";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CamporeeFormDialog({
  open,
  onOpenChange,
  camporee,
  onSuccess,
}: CamporeeFormDialogProps) {
  const t = useTranslations("camporees");
  const tVal = useTranslations("camporees.validation");
  const isEdit = !!camporee;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const schema = useMemo(() => buildSchema(tVal), [tVal]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      name: "",
      description: "",
      start_date: "",
      end_date: "",
      local_camporee_place: "",
      local_field_id: 0,
      registration_cost: undefined,
      includes_adventurers: false,
      includes_pathfinders: true,
      includes_master_guides: false,
    },
  });

  const includesAdventurers = watch("includes_adventurers");
  const includesPathfinders = watch("includes_pathfinders");
  const includesMasterGuides = watch("includes_master_guides");

  useEffect(() => {
    if (open) {
      if (camporee) {
        reset({
          name: camporee.name,
          description: camporee.description ?? "",
          start_date: toDateInput(camporee.start_date),
          end_date: toDateInput(camporee.end_date),
          local_camporee_place: camporee.local_camporee_place ?? "",
          local_field_id: camporee.local_field_id ?? 0,
          registration_cost: camporee.registration_cost ?? undefined,
          includes_adventurers: camporee.includes_adventurers ?? false,
          includes_pathfinders: camporee.includes_pathfinders ?? true,
          includes_master_guides: camporee.includes_master_guides ?? false,
        });
      } else {
        reset({
          name: "",
          description: "",
          start_date: "",
          end_date: "",
          local_camporee_place: "",
          local_field_id: 0,
          registration_cost: undefined,
          includes_adventurers: false,
          includes_pathfinders: true,
          includes_master_guides: false,
        });
      }
    }
  }, [open, camporee, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      if (isEdit && camporee) {
        const id = camporee.camporee_id ?? camporee.id ?? 0;
        await updateCamporee(id, {
          name: values.name,
          description: values.description,
          start_date: values.start_date,
          end_date: values.end_date,
          local_camporee_place: values.local_camporee_place,
          local_field_id: values.local_field_id,
          registration_cost: values.registration_cost,
          includes_adventurers: values.includes_adventurers,
          includes_pathfinders: values.includes_pathfinders,
          includes_master_guides: values.includes_master_guides,
        });
        toast.success(t("toasts.camporee_updated"));
      } else {
        await createCamporee({
          name: values.name,
          description: values.description,
          start_date: values.start_date,
          end_date: values.end_date,
          local_camporee_place: values.local_camporee_place,
          local_field_id: values.local_field_id,
          registration_cost: values.registration_cost,
          includes_adventurers: values.includes_adventurers,
          includes_pathfinders: values.includes_pathfinders,
          includes_master_guides: values.includes_master_guides,
        });
        toast.success(t("toasts.camporee_created"));
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.save_camporee");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("form.titleEdit") : t("form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("form.labelName")} <span aria-hidden="true" className="text-destructive">*</span></Label>
            <Input
              id="name"
              {...register("name")}
              placeholder={t("form.placeholderName")}
              aria-required="true"
            />
            {errors.name && (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">{errors.name.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="description">{t("form.labelDescription")}</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder={t("form.placeholderDescription")}
              rows={3}
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">{t("form.labelStartDate")} <span aria-hidden="true" className="text-destructive">*</span></Label>
              <Input id="start_date" type="date" {...register("start_date")} aria-required="true" />
              {errors.start_date && (
                <p className="text-xs text-destructive" role="alert" aria-live="polite">
                  {errors.start_date.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">{t("form.labelEndDate")} <span aria-hidden="true" className="text-destructive">*</span></Label>
              <Input id="end_date" type="date" {...register("end_date")} aria-required="true" />
              {errors.end_date && (
                <p className="text-xs text-destructive" role="alert" aria-live="polite">
                  {errors.end_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Lugar */}
          <div className="space-y-1.5">
            <Label htmlFor="local_camporee_place">{t("form.labelPlace")} <span aria-hidden="true" className="text-destructive">*</span></Label>
            <Input
              id="local_camporee_place"
              {...register("local_camporee_place")}
              placeholder={t("form.placeholderPlace")}
              aria-required="true"
            />
            {errors.local_camporee_place && (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">
                {errors.local_camporee_place.message}
              </p>
            )}
          </div>

          {/* Campo local */}
          <div className="space-y-1.5">
            <Label htmlFor="local_field_id">{t("form.labelLocalFieldId")} <span aria-hidden="true" className="text-destructive">*</span></Label>
            <Input
              id="local_field_id"
              type="number"
              min={1}
              {...register("local_field_id")}
              placeholder="1"
              aria-required="true"
            />
            {errors.local_field_id && (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">
                {errors.local_field_id.message}
              </p>
            )}
          </div>

          {/* Costo de inscripción */}
          <div className="space-y-1.5">
            <Label htmlFor="registration_cost">{t("form.labelRegistrationCost")}</Label>
            <Input
              id="registration_cost"
              type="number"
              min={0}
              step="0.01"
              {...register("registration_cost")}
              placeholder="0.00"
            />
            {errors.registration_cost && (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">
                {errors.registration_cost.message}
              </p>
            )}
          </div>

          {/* Tipos de club */}
          <div className="space-y-2">
            <Label>{t("form.labelIncludes")}</Label>
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includes_adventurers"
                  checked={includesAdventurers}
                  onCheckedChange={(checked) =>
                    setValue("includes_adventurers", checked === true)
                  }
                />
                <Label htmlFor="includes_adventurers" className="font-normal cursor-pointer">
                  {t("form.adventurers")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includes_pathfinders"
                  checked={includesPathfinders}
                  onCheckedChange={(checked) =>
                    setValue("includes_pathfinders", checked === true)
                  }
                />
                <Label htmlFor="includes_pathfinders" className="font-normal cursor-pointer">
                  {t("form.pathfinders")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includes_master_guides"
                  checked={includesMasterGuides}
                  onCheckedChange={(checked) =>
                    setValue("includes_master_guides", checked === true)
                  }
                />
                <Label htmlFor="includes_master_guides" className="font-normal cursor-pointer">
                  {t("form.masterGuides")}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? t("form.saving")
                  : t("form.creating")
                : isEdit
                  ? t("form.saveChanges")
                  : t("form.createCamporee")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
