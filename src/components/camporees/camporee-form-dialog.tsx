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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

export interface CamporeeFormDialogProps {
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

  const form = useForm<FormValues>({
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

  useEffect(() => {
    if (open) {
      if (camporee) {
        form.reset({
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
        form.reset({
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
  }, [open, camporee, form]);

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
          <DialogDescription>
            {isEdit
              ? "Modificá los datos del camporee local."
              : "Completá el formulario para crear un nuevo camporee local."}
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
                    {t("form.labelName")}{" "}
                    <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("form.placeholderName")}
                      aria-required="true"
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
                  <FormLabel>{t("form.labelDescription")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("form.placeholderDescription")}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.labelStartDate")}{" "}
                      <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="date" aria-required="true" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.labelEndDate")}{" "}
                      <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="date" aria-required="true" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Lugar */}
            <FormField
              control={form.control}
              name="local_camporee_place"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.labelPlace")}{" "}
                    <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("form.placeholderPlace")}
                      aria-required="true"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo local */}
            <FormField
              control={form.control}
              name="local_field_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.labelLocalFieldId")}{" "}
                    <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={1}
                      placeholder="1"
                      aria-required="true"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Costo de inscripción */}
            <FormField
              control={form.control}
              name="registration_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.labelRegistrationCost")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipos de club */}
            <div className="space-y-2">
              <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {t("form.labelIncludes")}
              </FormLabel>
              <div className="space-y-2 rounded-md border border-border p-3">
                <FormField
                  control={form.control}
                  name="includes_adventurers"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          id="includes_adventurers"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel htmlFor="includes_adventurers" className="font-normal cursor-pointer">
                        {t("form.adventurers")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="includes_pathfinders"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          id="includes_pathfinders"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel htmlFor="includes_pathfinders" className="font-normal cursor-pointer">
                        {t("form.pathfinders")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="includes_master_guides"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          id="includes_master_guides"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel htmlFor="includes_master_guides" className="font-normal cursor-pointer">
                        {t("form.masterGuides")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
