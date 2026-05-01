"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import {
  createAwardCategory,
  updateAwardCategory,
} from "@/lib/api/annual-folders";
import type { AwardCategory, AwardCategoryScope, AwardTier } from "@/lib/api/annual-folders";
import type { ClubType } from "@/lib/api/catalogs";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z
  .object({
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(200, "El nombre no puede superar 200 caracteres"),
    description: z
      .string()
      .max(500, "La descripción no puede superar 500 caracteres")
      .optional(),
    // ── 8.4-A scope (member / section / club) ────────────────────────────────
    scope: z.enum(["club", "section", "member"] as const),
    club_type_id: z.string(), // "all" | stringified number
    min_points: z.coerce.number().int().min(0, "Debe ser 0 o mayor"),
    max_points: z.coerce
      .number()
      .int()
      .min(0, "Debe ser 0 o mayor")
      .optional()
      .nullable(),
    icon: z
      .string()
      .max(100, "El ícono no puede superar 100 caracteres")
      .optional(),
    order: z.coerce.number().int().min(0, "El orden debe ser 0 o mayor"),
    // ── 8.4-C composite scoring ──────────────────────────────────────────────
    min_composite_pct: z.coerce
      .number()
      .min(0, "Debe ser 0 o mayor")
      .max(100, "No puede superar 100")
      .optional()
      .nullable(),
    max_composite_pct: z.coerce
      .number()
      .min(0, "Debe ser 0 o mayor")
      .max(100, "No puede superar 100")
      .optional()
      .nullable(),
    // ── 8.4-C Phase C — visual tier ──────────────────────────────────────────
    tier: z.enum(["BRONZE", "SILVER", "GOLD", "DIAMOND"] as const).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const min = data.min_composite_pct;
    const max = data.max_composite_pct;
    if (min != null && max != null && min >= max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El min_composite_pct debe ser menor que el max_composite_pct.",
        path: ["min_composite_pct"],
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface AwardCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: AwardCategory | null;
  clubTypes: ClubType[];
  /** Default scope for create mode — passed by parent based on active scope tab */
  defaultScope?: AwardCategoryScope;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AwardCategoryFormDialog({
  open,
  onOpenChange,
  category,
  clubTypes,
  defaultScope = "club",
  onSuccess,
}: AwardCategoryFormDialogProps) {
  const t = useTranslations("annual_folders");
  const isEdit = !!category;
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
      name: "",
      description: "",
      scope: defaultScope,
      club_type_id: "all",
      min_points: 0,
      max_points: null,
      icon: "",
      order: 0,
      min_composite_pct: null,
      max_composite_pct: null,
      tier: null,
    },
  });

  const clubTypeValue = watch("club_type_id");
  const scopeValue = watch("scope");
  const tierValue = watch("tier");

  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          name: category.name,
          description: category.description ?? "",
          scope: category.scope ?? defaultScope,
          club_type_id:
            category.club_type_id !== null
              ? String(category.club_type_id)
              : "all",
          min_points: category.min_points,
          max_points: category.max_points ?? null,
          icon: category.icon ?? "",
          order: category.order,
          min_composite_pct: category.min_composite_pct ?? null,
          max_composite_pct: category.max_composite_pct ?? null,
          tier: category.tier ?? null,
        });
      } else {
        reset({
          name: "",
          description: "",
          scope: defaultScope,
          club_type_id: "all",
          min_points: 0,
          max_points: null,
          icon: "",
          order: 0,
          min_composite_pct: null,
          max_composite_pct: null,
          tier: null,
        });
      }
    }
  }, [open, category, defaultScope, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: values.name,
        description: values.description || null,
        scope: values.scope,
        club_type_id:
          values.club_type_id === "all" ? null : Number(values.club_type_id),
        min_points: values.min_points,
        max_points:
          values.max_points !== null && values.max_points !== undefined
            ? values.max_points
            : null,
        icon: values.icon || null,
        order: values.order,
        min_composite_pct:
          values.min_composite_pct !== null &&
          values.min_composite_pct !== undefined
            ? values.min_composite_pct
            : null,
        max_composite_pct:
          values.max_composite_pct !== null &&
          values.max_composite_pct !== undefined
            ? values.max_composite_pct
            : null,
        tier: values.tier ?? null,
      };

      if (isEdit && category) {
        await updateAwardCategory(category.award_category_id, payload);
        toast.success(t("toasts.category_updated"));
      } else {
        await createAwardCategory(payload);
        toast.success(t("toasts.category_created"));
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al guardar la categoría de premio";
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
            {isEdit ? "Editar categoría de premio" : "Nueva categoría de premio"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Nombre *</Label>
            <Input
              id="cat-name"
              {...register("name")}
              placeholder="Ej. Oro, Plata, Bronce"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Descripcion */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-description">Descripción</Label>
            <Textarea
              id="cat-description"
              {...register("description")}
              placeholder="Descripción opcional de la categoría"
              rows={3}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Alcance */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-scope">Alcance *</Label>
            <Select
              value={scopeValue}
              onValueChange={(val) => setValue("scope", val as AwardCategoryScope)}
            >
              <SelectTrigger id="cat-scope">
                <SelectValue placeholder="Seleccionar alcance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="club">Club</SelectItem>
                <SelectItem value="section">Sección</SelectItem>
                <SelectItem value="member">Miembro</SelectItem>
              </SelectContent>
            </Select>
            {errors.scope && (
              <p className="text-xs text-destructive">{errors.scope.message}</p>
            )}
          </div>

          {/* Tier visual */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-tier">Nivel visual</Label>
            <Select
              value={tierValue ?? "none"}
              onValueChange={(val) =>
                setValue("tier", val === "none" ? null : (val as AwardTier))
              }
            >
              <SelectTrigger id="cat-tier">
                <SelectValue placeholder="Sin clasificación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin clasificación</SelectItem>
                <SelectItem value="BRONZE">Bronce</SelectItem>
                <SelectItem value="SILVER">Plata</SelectItem>
                <SelectItem value="GOLD">Oro</SelectItem>
                <SelectItem value="DIAMOND">Diamante</SelectItem>
              </SelectContent>
            </Select>
            {errors.tier && (
              <p className="text-xs text-destructive">{errors.tier.message}</p>
            )}
          </div>

          {/* Tipo de club */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-club-type">Tipo de club</Label>
            <Select
              value={clubTypeValue}
              onValueChange={(val) => setValue("club_type_id", val)}
            >
              <SelectTrigger id="cat-club-type">
                <SelectValue placeholder="Seleccionar tipo de club" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {clubTypes.map((ct) => (
                  <SelectItem
                    key={ct.club_type_id}
                    value={String(ct.club_type_id)}
                  >
                    {ct.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.club_type_id && (
              <p className="text-xs text-destructive">
                {errors.club_type_id.message}
              </p>
            )}
          </div>

          {/* Puntos min / max */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-min-points">Puntos mínimos *</Label>
              <Input
                id="cat-min-points"
                type="number"
                min={0}
                {...register("min_points")}
                placeholder="0"
              />
              {errors.min_points && (
                <p className="text-xs text-destructive">
                  {errors.min_points.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-max-points">Puntos máximos</Label>
              <Input
                id="cat-max-points"
                type="number"
                min={0}
                {...register("max_points")}
                placeholder="Sin límite"
              />
              {errors.max_points && (
                <p className="text-xs text-destructive">
                  {errors.max_points.message}
                </p>
              )}
            </div>
          </div>

          {/* Composite % min / max */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-min-composite-pct">Min composite %</Label>
              <Input
                id="cat-min-composite-pct"
                type="number"
                min={0}
                max={100}
                step="0.01"
                {...register("min_composite_pct")}
                placeholder="Ej. 60"
              />
              {errors.min_composite_pct && (
                <p className="text-xs text-destructive">
                  {errors.min_composite_pct.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-max-composite-pct">Max composite %</Label>
              <Input
                id="cat-max-composite-pct"
                type="number"
                min={0}
                max={100}
                step="0.01"
                {...register("max_composite_pct")}
                placeholder="Ej. 80"
              />
              {errors.max_composite_pct && (
                <p className="text-xs text-destructive">
                  {errors.max_composite_pct.message}
                </p>
              )}
            </div>
          </div>

          {/* Icono / Orden */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-icon">Ícono</Label>
              <Input
                id="cat-icon"
                {...register("icon")}
                placeholder="Ej. trophy, medal"
                maxLength={100}
              />
              {errors.icon && (
                <p className="text-xs text-destructive">
                  {errors.icon.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-order">Orden *</Label>
              <Input
                id="cat-order"
                type="number"
                min={0}
                {...register("order")}
                placeholder="0"
              />
              {errors.order && (
                <p className="text-xs text-destructive">
                  {errors.order.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? "Guardando..."
                  : "Creando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
