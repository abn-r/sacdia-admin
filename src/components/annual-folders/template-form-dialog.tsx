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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createTemplate, updateTemplate } from "@/lib/api/annual-folders";
import type { FolderTemplate } from "@/lib/api/annual-folders";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import { listUnions, listLocalFields } from "@/lib/api/geography";
import type { Union, LocalField } from "@/lib/api/geography";

// ─── Schema factory ───────────────────────────────────────────────────────────

const ownerTierSchema = z.enum(["union", "local_field"]);

function buildSchema(t: ReturnType<typeof useTranslations<"annual_folders.validation">>) {
  return z
    .object({
      name: z
        .string()
        .min(3, t("name_min", { min: 3 }))
        .max(100, t("name_max", { max: 100 })),
      club_type_id: z.coerce.number().int().positive(t("club_type_required")),
      ecclesiastical_year_id: z.coerce
        .number()
        .int()
        .positive(t("ecclesiastical_year_required")),
      minimum_points: z.coerce
        .number()
        .int()
        .min(0, t("minimum_points_min")),
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
            message: t("owner_union_required"),
          });
        }
      } else {
        if (!data.owner_local_field_id || data.owner_local_field_id <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["owner_local_field_id"],
            message: t("owner_local_field_required"),
          });
        }
      }
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

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
  const tVal = useTranslations("annual_folders.validation");
  const isEdit = Boolean(template);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const schema = useMemo(() => buildSchema(tVal), [tVal]);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as z.ZodType<FormValues, FormValues>),
    defaultValues,
  });

  // ownerTier drives conditional rendering — single watch is justified
  const ownerTier = form.watch("owner_tier");

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
      form.reset({
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
  }, [open, template, clubTypes, ecclesiasticalYears, form]);

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
          <DialogDescription>
            {isEdit
              ? "Modificá los datos de la plantilla de carpeta anual."
              : "Completá el formulario para crear una nueva plantilla de carpeta anual."}
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
                  <FormLabel>
                    {t("templateDialog.fieldName")}{" "}
                    <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("templateDialog.fieldNamePlaceholder")}
                      aria-required="true"
                    />
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
                  <FormLabel>
                    {t("templateDialog.fieldClubType")}{" "}
                    <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={String(field.value)}
                      onValueChange={(val) => field.onChange(Number(val))}
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Año eclesiástico */}
            <FormField
              control={form.control}
              name="ecclesiastical_year_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("templateDialog.fieldYear")}{" "}
                    <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={String(field.value)}
                      onValueChange={(val) => field.onChange(Number(val))}
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Owner tier — radio group */}
            <FormField
              control={form.control}
              name="owner_tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("templateDialog.fieldOwner")}{" "}
                    <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        // Clear the other tier selection to avoid stale values
                        if (val === "union") {
                          form.setValue("owner_local_field_id", null);
                        } else {
                          form.setValue("owner_union_id", null);
                        }
                      }}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="union" id="owner-tier-union" />
                        <FormLabel htmlFor="owner-tier-union" className="cursor-pointer font-normal">
                          {t("templateDialog.fieldOwnerTierUnion")}
                        </FormLabel>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="local_field" id="owner-tier-local-field" />
                        <FormLabel htmlFor="owner-tier-local-field" className="cursor-pointer font-normal">
                          {t("templateDialog.fieldOwnerTierLocalField")}
                        </FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional owner select */}
            {ownerTier === "union" ? (
              <FormField
                control={form.control}
                name="owner_union_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("templateDialog.fieldUnion")}{" "}
                      <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        disabled={loadingOwnerCatalogs}
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(val) =>
                          field.onChange(Number(val))
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="owner_local_field_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("templateDialog.fieldLocalField")}{" "}
                      <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        disabled={loadingOwnerCatalogs}
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(val) =>
                          field.onChange(Number(val))
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Puntos mínimos / Fecha de cierre */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="minimum_points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("templateDialog.fieldMinPoints")}</FormLabel>
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
                name="closing_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("templateDialog.fieldClosingDate")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="datetime-local"
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
