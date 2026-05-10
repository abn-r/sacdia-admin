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

  const form = useForm<FormValues>({
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

  useEffect(() => {
    if (open) {
      if (camporee) {
        form.reset({
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
        form.reset({
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
  }, [open, camporee, form]);

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
          <DialogDescription>
            {isEdit
              ? "Modificá los datos del camporee de unión."
              : "Completá el formulario para crear un nuevo camporee de unión."}
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
                    {t("unionForm.labelName")} <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("unionForm.placeholderName")}
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
                  <FormLabel>{t("unionForm.labelDescription")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("unionForm.placeholderDescription")}
                      rows={3}
                      {...field}
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
                      {t("unionForm.labelStartDate")} <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" aria-required="true" {...field} />
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
                      {t("unionForm.labelEndDate")} <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" aria-required="true" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Unión */}
            <FormField
              control={form.control}
              name="union_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("unionForm.labelUnion")} <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value > 0 ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(Number(val))}
                    >
                      <SelectTrigger className="w-full" aria-required="true">
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Lugar */}
            <FormField
              control={form.control}
              name="place"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("unionForm.labelPlace")} <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("unionForm.placeholderPlace")}
                      aria-required="true"
                      {...field}
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
                  <FormLabel>{t("unionForm.labelRegistrationCost")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipos de club */}
            <div className="space-y-2">
              <p className="text-sm font-medium leading-none">{t("unionForm.labelIncludes")}</p>
              <div className="space-y-2 rounded-md border border-border p-3">
                <FormField
                  control={form.control}
                  name="includes_adventurers"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          id="uc-includes_adventurers"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor="uc-includes_adventurers"
                        className="cursor-pointer font-normal"
                      >
                        {t("unionForm.adventurers")}
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
                          id="uc-includes_pathfinders"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor="uc-includes_pathfinders"
                        className="cursor-pointer font-normal"
                      >
                        {t("unionForm.pathfinders")}
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
                          id="uc-includes_master_guides"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor="uc-includes_master_guides"
                        className="cursor-pointer font-normal"
                      >
                        {t("unionForm.masterGuides")}
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
