"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import {
  createAwardCategory,
  updateAwardCategory,
} from "@/lib/api/annual-folders";
import type { AwardCategory, AwardCategoryScope, AwardTier } from "@/lib/api/annual-folders";
import type { ClubType } from "@/lib/api/catalogs";

// ─── Schema factory ───────────────────────────────────────────────────────────

function buildSchema(t: ReturnType<typeof useTranslations<"annual_folders.validation">>) {
  return z
    .object({
      name: z
        .string()
        .min(2, t("name_min", { min: 2 }))
        .max(200, t("name_max", { max: 200 })),
      description: z
        .string()
        .max(500, t("description_max", { max: 500 }))
        .optional(),
      // ── 8.4-A scope (member / section / club) ────────────────────────────────
      scope: z.enum(["club", "section", "member"] as const),
      club_type_id: z.string(), // "all" | stringified number
      min_points: z.coerce.number().int().min(0, t("composite_pct_min")),
      max_points: z.coerce
        .number()
        .int()
        .min(0, t("composite_pct_min"))
        .optional()
        .nullable(),
      icon: z
        .string()
        .max(100, t("name_max", { max: 100 }))
        .optional(),
      order: z.coerce.number().int().min(0, t("order_min_0")),
      // ── 8.4-C composite scoring ──────────────────────────────────────────────
      min_composite_pct: z.coerce
        .number()
        .min(0, t("composite_pct_min"))
        .max(100, t("composite_pct_max", { max: 100 }))
        .optional()
        .nullable(),
      max_composite_pct: z.coerce
        .number()
        .min(0, t("composite_pct_min"))
        .max(100, t("composite_pct_max", { max: 100 }))
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
          message: t("composite_pct_invalid"),
          path: ["min_composite_pct"],
        });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

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
  const tVal = useTranslations("annual_folders.validation");
  const isEdit = !!category;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const schema = useMemo(() => buildSchema(tVal), [tVal]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as z.ZodType<FormValues, FormValues>),
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


  useEffect(() => {
    if (open) {
      if (category) {
        form.reset({
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
        form.reset({
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
  }, [open, category, defaultScope, form]);

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
          <DialogDescription>
            {isEdit
              ? "Modificá los parámetros de la categoría de premio."
              : "Definí una nueva categoría de premio para las carpetas anuales."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Nombre */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ej. Oro, Plata, Bronce"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Descripcion */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descripción opcional de la categoría"
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Alcance */}
          <FormField
            control={form.control}
            name="scope"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alcance <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(val) => field.onChange(val as AwardCategoryScope)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar alcance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="club">Club</SelectItem>
                      <SelectItem value="section">Sección</SelectItem>
                      <SelectItem value="member">Miembro</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tier visual */}
          <FormField
            control={form.control}
            name="tier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel visual</FormLabel>
                <FormControl>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(val) =>
                      field.onChange(val === "none" ? null : (val as AwardTier))
                    }
                  >
                    <SelectTrigger>
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tipo de club */}
          <FormField
            control={form.control}
            name="club_type_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de club</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Puntos min / max */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="min_points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puntos mínimos <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      placeholder="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puntos máximos</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="number"
                      min={0}
                      placeholder="Sin límite"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Composite % min / max */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="min_composite_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min composite %</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="Ej. 60"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_composite_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max composite %</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="Ej. 80"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Icono / Orden */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ícono</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej. trophy, medal"
                      maxLength={100}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orden <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      placeholder="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
