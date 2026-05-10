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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createTemplateSection,
  updateTemplateSection,
} from "@/lib/api/annual-folders";
import type { FolderTemplateSection } from "@/lib/api/annual-folders";

// ─── Schema factory ───────────────────────────────────────────────────────────

function buildSchema(t: ReturnType<typeof useTranslations<"annual_folders.validation">>) {
  return z.object({
    name: z
      .string()
      .min(3, t("name_min", { min: 3 }))
      .max(100, t("name_max", { max: 100 })),
    description: z
      .string()
      .max(500, t("description_max", { max: 500 }))
      .optional(),
    order: z.coerce.number().int().min(1, t("order_min", { min: 1 })),
    required: z.boolean(),
    max_points: z.coerce
      .number()
      .int()
      .min(0, t("max_points_min")),
    minimum_points: z.coerce
      .number()
      .int()
      .min(0, t("minimum_points_min")),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  section?: FolderTemplateSection | null;
  nextOrder?: number;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SectionFormDialog({
  open,
  onOpenChange,
  templateId,
  section,
  nextOrder = 1,
  onSuccess,
}: SectionFormDialogProps) {
  const t = useTranslations("annual_folders");
  const tVal = useTranslations("annual_folders.validation");
  const isEdit = !!section;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const schema = useMemo(() => buildSchema(tVal), [tVal]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      name: "",
      description: "",
      order: nextOrder,
      required: true,
      max_points: 0,
      minimum_points: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (section) {
        form.reset({
          name: section.name,
          description: section.description ?? "",
          order: section.order,
          required: section.required,
          max_points: section.max_points,
          minimum_points: section.minimum_points,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          order: nextOrder,
          required: true,
          max_points: 0,
          minimum_points: 0,
        });
      }
    }
  }, [open, section, nextOrder, form]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      if (isEdit && section) {
        await updateTemplateSection(section.section_id, {
          name: values.name,
          description: values.description || undefined,
          order: values.order,
          required: values.required,
          max_points: values.max_points,
          minimum_points: values.minimum_points,
        });
        toast.success(t("toasts.section_updated"));
      } else {
        await createTemplateSection(templateId, {
          name: values.name,
          description: values.description || undefined,
          order: values.order,
          required: values.required,
          max_points: values.max_points,
          minimum_points: values.minimum_points,
        });
        toast.success(t("toasts.section_created"));
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.save_section_failed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("sectionDialog.titleEdit") : t("sectionDialog.titleCreate")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modificá los datos de la sección de la plantilla."
              : "Completá el formulario para agregar una nueva sección a la plantilla."}
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
                    {t("sectionDialog.fieldName")}{" "}
                    <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("sectionDialog.fieldNamePlaceholder")}
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("sectionDialog.fieldDescription")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("sectionDialog.fieldDescriptionPlaceholder")}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Orden */}
            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("sectionDialog.fieldOrder")}{" "}
                    <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="1"
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Requerida */}
            <FormField
              control={form.control}
              name="required"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 space-y-0">
                  <div className="space-y-0.5">
                    <Label htmlFor="section-required" className="cursor-pointer text-sm font-medium">
                      {t("sectionDialog.fieldRequired")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("sectionDialog.fieldRequiredDescription")}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      id="section-required"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Puntos */}
            <div className="grid grid-cols-2 gap-3">
              {/* Puntos máximos */}
              <FormField
                control={form.control}
                name="max_points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("sectionDialog.fieldMaxPoints")}{" "}
                      <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        aria-required="true"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Puntos mínimos */}
              <FormField
                control={form.control}
                name="minimum_points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("sectionDialog.fieldMinPoints")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
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
                {t("sectionDialog.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isEdit
                    ? t("sectionDialog.submittingEdit")
                    : t("sectionDialog.submittingCreate")
                  : isEdit
                    ? t("sectionDialog.submitEdit")
                    : t("sectionDialog.submitCreate")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
