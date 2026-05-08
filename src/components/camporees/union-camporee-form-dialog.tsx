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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { createUnionCamporee, updateUnionCamporee } from "@/lib/api/camporees";
import type { UnionCamporee } from "@/lib/api/camporees";
import type { Union } from "@/lib/api/geography";

// ─── Schema factory ────────────────────────────────────────────────────────────

function buildSchema(t: ReturnType<typeof useTranslations<"camporees.validation">>) {
  return z
    .object({
      name: z.string().min(1, t("name_required")),
      description: z.string().optional(),
      start_date: z.string().min(1, t("start_date_required")),
      end_date: z.string().min(1, t("end_date_required")),
      union_id: z.coerce.number().int().min(1, t("union_required")),
      place: z.string().min(1, t("place_required")),
      registration_cost: z.coerce.number().min(0).optional(),
      includes_adventurers: z.boolean(),
      includes_pathfinders: z.boolean(),
      includes_master_guides: z.boolean(),
    })
    .refine((data) => data.start_date <= data.end_date, {
      message: t("end_date_after_start"),
      path: ["end_date"],
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface UnionCamporeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporee?: UnionCamporee | null;
  unions: Union[];
  onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(dateStr?: string | null): string {
  if (!dateStr) return "";
  return dateStr.split("T")[0] ?? "";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnionCamporeeFormDialog({
  open,
  onOpenChange,
  camporee,
  unions,
  onSuccess,
}: UnionCamporeeFormDialogProps) {
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
      union_id: 0,
      place: "",
      registration_cost: undefined,
      includes_adventurers: false,
      includes_pathfinders: true,
      includes_master_guides: false,
    },
  });

  const includesAdventurers = watch("includes_adventurers");
  const includesPathfinders = watch("includes_pathfinders");
  const includesMasterGuides = watch("includes_master_guides");
  const unionId = watch("union_id");

  useEffect(() => {
    if (open) {
      if (camporee) {
        reset({
          name: camporee.name,
          description: camporee.description ?? "",
          start_date: toDateInput(camporee.start_date),
          end_date: toDateInput(camporee.end_date),
          union_id: camporee.union_id ?? 0,
          place: camporee.place ?? "",
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
          union_id: 0,
          place: "",
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
      const payload = {
        name: values.name,
        description: values.description,
        start_date: values.start_date,
        end_date: values.end_date,
        union_id: values.union_id,
        place: values.place,
        registration_cost: values.registration_cost,
        includes_adventurers: values.includes_adventurers,
        includes_pathfinders: values.includes_pathfinders,
        includes_master_guides: values.includes_master_guides,
      };

      if (isEdit && camporee) {
        const id = camporee.union_camporee_id ?? camporee.id ?? 0;
        await updateUnionCamporee(id, payload);
        toast.success(t("toasts.union_camporee_updated"));
      } else {
        await createUnionCamporee(payload);
        toast.success(t("toasts.union_camporee_created"));
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
            {isEdit ? t("unionForm.titleEdit") : t("unionForm.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="uc-name">{t("unionForm.labelName")} <span aria-hidden="true" className="text-destructive">*</span></Label>
            <Input
              id="uc-name"
              {...register("name")}
              placeholder={t("unionForm.placeholderName")}
              aria-required="true"
            />
            {errors.name && (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">{errors.name.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="uc-description">{t("unionForm.labelDescription")}</Label>
            <Textarea
              id="uc-description"
              {...register("description")}
              placeholder={t("unionForm.placeholderDescription")}
              rows={3}
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="uc-start_date">{t("unionForm.labelStartDate")} <span aria-hidden="true" className="text-destructive">*</span></Label>
              <Input id="uc-start_date" type="date" {...register("start_date")} aria-required="true" />
              {errors.start_date && (
                <p className="text-xs text-destructive" role="alert" aria-live="polite">{errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uc-end_date">{t("unionForm.labelEndDate")} <span aria-hidden="true" className="text-destructive">*</span></Label>
              <Input id="uc-end_date" type="date" {...register("end_date")} aria-required="true" />
              {errors.end_date && (
                <p className="text-xs text-destructive" role="alert" aria-live="polite">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* Unión */}
          <div className="space-y-1.5">
            <Label htmlFor="uc-union_id">{t("unionForm.labelUnion")} <span aria-hidden="true" className="text-destructive">*</span></Label>
            <Select
              value={unionId > 0 ? String(unionId) : ""}
              onValueChange={(val) => setValue("union_id", Number(val))}
            >
              <SelectTrigger id="uc-union_id" className="w-full" aria-required="true">
                <SelectValue placeholder={t("unionForm.placeholderUnion")} />
              </SelectTrigger>
              <SelectContent>
                {unions.map((u) => (
                  <SelectItem key={u.union_id} value={String(u.union_id)}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.union_id && (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">{errors.union_id.message}</p>
            )}
          </div>

          {/* Lugar */}
          <div className="space-y-1.5">
            <Label htmlFor="uc-place">{t("unionForm.labelPlace")} <span aria-hidden="true" className="text-destructive">*</span></Label>
            <Input
              id="uc-place"
              {...register("place")}
              placeholder={t("unionForm.placeholderPlace")}
              aria-required="true"
            />
            {errors.place && (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">{errors.place.message}</p>
            )}
          </div>

          {/* Costo de inscripción */}
          <div className="space-y-1.5">
            <Label htmlFor="uc-registration_cost">{t("unionForm.labelRegistrationCost")}</Label>
            <Input
              id="uc-registration_cost"
              type="number"
              min={0}
              step="0.01"
              {...register("registration_cost")}
              placeholder="0.00"
            />
            {errors.registration_cost && (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">{errors.registration_cost.message}</p>
            )}
          </div>

          {/* Tipos de club */}
          <div className="space-y-2">
            <Label>{t("unionForm.labelIncludes")}</Label>
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="uc-includes_adventurers"
                  checked={includesAdventurers}
                  onCheckedChange={(checked) =>
                    setValue("includes_adventurers", checked === true)
                  }
                />
                <Label
                  htmlFor="uc-includes_adventurers"
                  className="cursor-pointer font-normal"
                >
                  {t("unionForm.adventurers")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="uc-includes_pathfinders"
                  checked={includesPathfinders}
                  onCheckedChange={(checked) =>
                    setValue("includes_pathfinders", checked === true)
                  }
                />
                <Label
                  htmlFor="uc-includes_pathfinders"
                  className="cursor-pointer font-normal"
                >
                  {t("unionForm.pathfinders")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="uc-includes_master_guides"
                  checked={includesMasterGuides}
                  onCheckedChange={(checked) =>
                    setValue("includes_master_guides", checked === true)
                  }
                />
                <Label
                  htmlFor="uc-includes_master_guides"
                  className="cursor-pointer font-normal"
                >
                  {t("unionForm.masterGuides")}
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
              {t("unionForm.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? t("unionForm.saving")
                  : t("unionForm.creating")
                : isEdit
                  ? t("unionForm.saveChanges")
                  : t("unionForm.createCamporee")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
