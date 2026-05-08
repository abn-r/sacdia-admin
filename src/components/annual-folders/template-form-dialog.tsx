"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
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
    resolver: zodResolver(formSchema as z.ZodType<FormValues, FormValues>),
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
  }, [open, t]);

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
        err instanceof Error ? err.message : t("errors.save_template_failed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("templateDialog.titleEdit") : t("templateDialog.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="template-name">
              {t("templateDialog.fieldName")}{" "}
              <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="template-name"
              {...register("name")}
              placeholder={t("templateDialog.fieldNamePlaceholder")}
              aria-required="true"
            />
            {errors.name && (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">{errors.name.message}</p>
            )}
          </div>

          {/* Tipo de club */}
          <div className="space-y-1.5">
            <Label htmlFor="template-club-type">
              {t("templateDialog.fieldClubType")}{" "}
              <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              value={String(clubTypeValue)}
              onValueChange={(val) => setValue("club_type_id", Number(val))}
            >
              <SelectTrigger id="template-club-type" aria-required="true">
                <SelectValue placeholder={t("templateDialog.fieldClubTypePlaceholder")} />
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
                    {t("templateDialog.fieldClubTypeNone")}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.club_type_id && (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">
                {errors.club_type_id.message}
              </p>
            )}
          </div>

          {/* Año eclesiástico */}
          <div className="space-y-1.5">
            <Label htmlFor="template-ecclesiastical-year">
              {t("templateDialog.fieldYear")}{" "}
              <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              value={String(yearValue)}
              onValueChange={(val) =>
                setValue("ecclesiastical_year_id", Number(val))
              }
            >
              <SelectTrigger id="template-ecclesiastical-year" aria-required="true">
                <SelectValue placeholder={t("templateDialog.fieldYearPlaceholder")} />
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
                          {t("templateDialog.fieldYearActive")}
                        </span>
                      )}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="0" disabled>
                    {t("templateDialog.fieldYearNone")}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.ecclesiastical_year_id && (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">
                {errors.ecclesiastical_year_id.message}
              </p>
            )}
          </div>

          {/* Owner tier — radio group */}
          <div className="space-y-2">
            <Label>
              {t("templateDialog.fieldOwner")}{" "}
              <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
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
                      {t("templateDialog.fieldOwnerTierUnion")}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="local_field" id="owner-tier-local-field" />
                    <Label htmlFor="owner-tier-local-field" className="cursor-pointer font-normal">
                      {t("templateDialog.fieldOwnerTierLocalField")}
                    </Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          {/* Conditional owner select */}
          {ownerTier === "union" ? (
            <div className="space-y-1.5">
              <Label htmlFor="template-owner-union">
                {t("templateDialog.fieldUnion")}{" "}
                <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                disabled={loadingOwnerCatalogs}
                value={ownerUnionId ? String(ownerUnionId) : ""}
                onValueChange={(val) =>
                  setValue("owner_union_id", Number(val), { shouldValidate: true })
                }
              >
                <SelectTrigger id="template-owner-union" aria-required="true">
                  <SelectValue
                    placeholder={
                      loadingOwnerCatalogs
                        ? t("templateDialog.fieldLoading")
                        : t("templateDialog.fieldUnionPlaceholder")
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
                      {loadingOwnerCatalogs
                        ? t("templateDialog.fieldLoading")
                        : t("templateDialog.fieldUnionNone")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.owner_union_id && (
                <p className="text-xs text-destructive" role="alert" aria-live="polite">
                  {errors.owner_union_id.message}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="template-owner-local-field">
                {t("templateDialog.fieldLocalField")}{" "}
                <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                disabled={loadingOwnerCatalogs}
                value={ownerLocalFieldId ? String(ownerLocalFieldId) : ""}
                onValueChange={(val) =>
                  setValue("owner_local_field_id", Number(val), { shouldValidate: true })
                }
              >
                <SelectTrigger id="template-owner-local-field" aria-required="true">
                  <SelectValue
                    placeholder={
                      loadingOwnerCatalogs
                        ? t("templateDialog.fieldLoading")
                        : t("templateDialog.fieldLocalFieldPlaceholder")
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
                      {loadingOwnerCatalogs
                        ? t("templateDialog.fieldLoading")
                        : t("templateDialog.fieldLocalFieldNone")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.owner_local_field_id && (
                <p className="text-xs text-destructive" role="alert" aria-live="polite">
                  {errors.owner_local_field_id.message}
                </p>
              )}
            </div>
          )}

          {/* Puntos mínimos / Fecha de cierre */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="template-minimum-points">{t("templateDialog.fieldMinPoints")}</Label>
              <Input
                id="template-minimum-points"
                type="number"
                min={0}
                {...register("minimum_points")}
                placeholder="0"
              />
              {errors.minimum_points && (
                <p className="text-xs text-destructive" role="alert" aria-live="polite">
                  {errors.minimum_points.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template-closing-date">{t("templateDialog.fieldClosingDate")}</Label>
              <Input
                id="template-closing-date"
                type="datetime-local"
                {...register("closing_date")}
              />
              {errors.closing_date && (
                <p className="text-xs text-destructive" role="alert" aria-live="polite">
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
              {t("templateDialog.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? t("templateDialog.submittingEdit")
                  : t("templateDialog.submittingCreate")
                : isEdit
                ? t("templateDialog.submitEdit")
                : t("templateDialog.submitCreate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
