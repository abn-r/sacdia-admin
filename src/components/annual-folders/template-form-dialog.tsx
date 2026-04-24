"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createTemplate, updateTemplate } from "@/lib/api/annual-folders";
import type { FolderTemplate } from "@/lib/api/annual-folders";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import { listUnions, listLocalFields } from "@/lib/api/geography";
import type { Union, LocalField } from "@/lib/api/geography";

// ─── Schema ───────────────────────────────────────────────────────────────────

const ownerTierSchema = z.enum(["union", "local_field"]);

const formSchema = z
  .object({
    name: z
      .string()
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .max(100, "El nombre no puede superar 100 caracteres"),
    club_type_id: z.coerce.number().int().positive("Selecciona un tipo de club"),
    ecclesiastical_year_id: z.coerce
      .number()
      .int()
      .positive("Selecciona un año eclesiástico"),
    minimum_points: z.coerce
      .number()
      .int()
      .min(0, "Los puntos mínimos no pueden ser negativos"),
    closing_date: z.string().optional(),
    owner_tier: ownerTierSchema,
    owner_union_id: z.coerce.number().int().nullable().optional(),
    owner_local_field_id: z.coerce.number().int().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.owner_tier === "union") {
      if (!data.owner_union_id || data.owner_union_id <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["owner_union_id"],
          message: "Selecciona una unión",
        });
      }
    } else {
      if (!data.owner_local_field_id || data.owner_local_field_id <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["owner_local_field_id"],
          message: "Selecciona un campo local",
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  /** When provided the dialog operates in edit mode. */
  template?: FolderTemplate | null;
  onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveOwnerTier(template?: FolderTemplate | null): "union" | "local_field" {
  if (template?.owner_union_id) return "union";
  if (template?.owner_local_field_id) return "local_field";
  return "union";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplateFormDialog({
  open,
  onOpenChange,
  clubTypes,
  ecclesiasticalYears,
  template,
  onSuccess,
}: TemplateFormDialogProps) {
  const t = useTranslations("annual_folders");
  const isEdit = Boolean(template);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Owner catalog data
  const [unions, setUnions] = useState<Union[]>([]);
  const [localFields, setLocalFields] = useState<LocalField[]>([]);
  const [loadingOwnerCatalogs, setLoadingOwnerCatalogs] = useState(false);

  const defaultValues: FormValues = {
    name: template?.name ?? "",
    club_type_id: template?.club_type_id ?? (clubTypes[0]?.club_type_id ?? 0),
    ecclesiastical_year_id:
      template?.ecclesiastical_year_id ??
      (ecclesiasticalYears.find((y) => y.active)?.ecclesiastical_year_id ??
        ecclesiasticalYears[0]?.ecclesiastical_year_id ??
        0),
    minimum_points: template?.minimum_points ?? 0,
    closing_date: template?.closing_date
      ? template.closing_date.slice(0, 16)
      : "",
    owner_tier: deriveOwnerTier(template),
    owner_union_id: template?.owner_union_id ?? null,
    owner_local_field_id: template?.owner_local_field_id ?? null,
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues,
  });

  const clubTypeValue = watch("club_type_id");
  const yearValue = watch("ecclesiastical_year_id");
  const ownerTier = watch("owner_tier");
  const ownerUnionId = watch("owner_union_id");
  const ownerLocalFieldId = watch("owner_local_field_id");

  // Load owner catalogs when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingOwnerCatalogs(true);
    Promise.all([listUnions(), listLocalFields()])
      .then(([fetchedUnions, fetchedLocalFields]) => {
        setUnions(Array.isArray(fetchedUnions) ? fetchedUnions : []);
        setLocalFields(Array.isArray(fetchedLocalFields) ? fetchedLocalFields : []);
      })
      .catch(() => toast.error(t("toasts.owner_catalogs_load_failed")))
      .finally(() => setLoadingOwnerCatalogs(false));
  }, [open]);

  // Reset form when dialog opens or template changes
  useEffect(() => {
    if (open) {
      reset({
        name: template?.name ?? "",
        club_type_id: template?.club_type_id ?? (clubTypes[0]?.club_type_id ?? 0),
        ecclesiastical_year_id:
          template?.ecclesiastical_year_id ??
          (ecclesiasticalYears.find((y) => y.active)?.ecclesiastical_year_id ??
            ecclesiasticalYears[0]?.ecclesiastical_year_id ??
            0),
        minimum_points: template?.minimum_points ?? 0,
        closing_date: template?.closing_date
          ? template.closing_date.slice(0, 16)
          : "",
        owner_tier: deriveOwnerTier(template),
        owner_union_id: template?.owner_union_id ?? null,
        owner_local_field_id: template?.owner_local_field_id ?? null,
      });
    }
  }, [open, template, clubTypes, ecclesiasticalYears, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const ownerFields =
        values.owner_tier === "union"
          ? { owner_union_id: values.owner_union_id ?? null, owner_local_field_id: null }
          : { owner_union_id: null, owner_local_field_id: values.owner_local_field_id ?? null };

      const payload = {
        name: values.name,
        club_type_id: values.club_type_id,
        ecclesiastical_year_id: values.ecclesiastical_year_id,
        minimum_points: values.minimum_points,
        closing_date: values.closing_date ? values.closing_date : null,
        ...ownerFields,
      };

      if (isEdit && template) {
        await updateTemplate(template.template_id, payload);
        toast.success(t("toasts.template_updated"));
      } else {
        await createTemplate(payload);
        toast.success(t("toasts.template_created"));
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al guardar la plantilla";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="template-name">
              Nombre <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="template-name"
              {...register("name")}
              placeholder="Ej. Carpeta Conquistadores 2025"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Tipo de club */}
          <div className="space-y-1.5">
            <Label>
              Tipo de club <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              value={String(clubTypeValue)}
              onValueChange={(val) => setValue("club_type_id", Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo de club" />
              </SelectTrigger>
              <SelectContent>
                {clubTypes.length > 0 ? (
                  clubTypes.map((ct) => (
                    <SelectItem
                      key={ct.club_type_id}
                      value={String(ct.club_type_id)}
                    >
                      {ct.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="0" disabled>
                    No hay tipos disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.club_type_id && (
              <p className="text-xs text-destructive">
                {errors.club_type_id.message}
              </p>
            )}
          </div>

          {/* Año eclesiástico */}
          <div className="space-y-1.5">
            <Label>
              Año eclesiástico <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              value={String(yearValue)}
              onValueChange={(val) =>
                setValue("ecclesiastical_year_id", Number(val))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar año" />
              </SelectTrigger>
              <SelectContent>
                {ecclesiasticalYears.length > 0 ? (
                  ecclesiasticalYears.map((year) => (
                    <SelectItem
                      key={year.ecclesiastical_year_id}
                      value={String(year.ecclesiastical_year_id)}
                    >
                      {year.name}
                      {year.active && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (activo)
                        </span>
                      )}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="0" disabled>
                    No hay años disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.ecclesiastical_year_id && (
              <p className="text-xs text-destructive">
                {errors.ecclesiastical_year_id.message}
              </p>
            )}
          </div>

          {/* Owner tier — radio group */}
          <div className="space-y-2">
            <Label>
              Propietario <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Controller
              name="owner_tier"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    // Clear the other tier selection to avoid stale values
                    if (val === "union") {
                      setValue("owner_local_field_id", null);
                    } else {
                      setValue("owner_union_id", null);
                    }
                  }}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="union" id="owner-tier-union" />
                    <Label htmlFor="owner-tier-union" className="cursor-pointer font-normal">
                      Unión
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="local_field" id="owner-tier-local-field" />
                    <Label htmlFor="owner-tier-local-field" className="cursor-pointer font-normal">
                      Campo local
                    </Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          {/* Conditional owner select */}
          {ownerTier === "union" ? (
            <div className="space-y-1.5">
              <Label>
                Unión <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                disabled={loadingOwnerCatalogs}
                value={ownerUnionId ? String(ownerUnionId) : ""}
                onValueChange={(val) =>
                  setValue("owner_union_id", Number(val), { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingOwnerCatalogs ? "Cargando..." : "Seleccionar unión"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {unions.length > 0 ? (
                    unions.map((u) => (
                      <SelectItem key={u.union_id} value={String(u.union_id)}>
                        {u.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="0" disabled>
                      {loadingOwnerCatalogs ? "Cargando..." : "Sin uniones disponibles"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.owner_union_id && (
                <p className="text-xs text-destructive">
                  {errors.owner_union_id.message}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>
                Campo local <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                disabled={loadingOwnerCatalogs}
                value={ownerLocalFieldId ? String(ownerLocalFieldId) : ""}
                onValueChange={(val) =>
                  setValue("owner_local_field_id", Number(val), { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingOwnerCatalogs ? "Cargando..." : "Seleccionar campo local"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {localFields.length > 0 ? (
                    localFields.map((lf) => (
                      <SelectItem
                        key={lf.local_field_id}
                        value={String(lf.local_field_id)}
                      >
                        {lf.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="0" disabled>
                      {loadingOwnerCatalogs ? "Cargando..." : "Sin campos disponibles"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.owner_local_field_id && (
                <p className="text-xs text-destructive">
                  {errors.owner_local_field_id.message}
                </p>
              )}
            </div>
          )}

          {/* Puntos mínimos / Fecha de cierre */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="template-minimum-points">Pts. mínimos para aprobar</Label>
              <Input
                id="template-minimum-points"
                type="number"
                min={0}
                {...register("minimum_points")}
                placeholder="0"
              />
              {errors.minimum_points && (
                <p className="text-xs text-destructive">
                  {errors.minimum_points.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template-closing-date">Fecha de cierre</Label>
              <Input
                id="template-closing-date"
                type="datetime-local"
                {...register("closing_date")}
              />
              {errors.closing_date && (
                <p className="text-xs text-destructive">
                  {errors.closing_date.message}
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
                : "Crear plantilla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
