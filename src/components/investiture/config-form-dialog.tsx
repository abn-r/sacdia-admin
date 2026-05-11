"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  createInvestitureConfig,
  updateInvestitureConfig,
  type InvestitureConfig,
  type CreateInvestitureConfigPayload,
  type UpdateInvestitureConfigPayload,
} from "@/lib/api/investiture";
import { listLocalFields, type LocalField } from "@/lib/api/geography";
import { listEcclesiasticalYears, type EcclesiasticalYear } from "@/lib/api/catalogs";

// ─── Schema ───────────────────────────────────────────────────────────────────

type ConfigTranslator = ReturnType<typeof useTranslations<"investiture">>;

function buildFormSchema(t: ConfigTranslator) {
  return z.object({
    local_field_id: z.coerce
      .number({ error: t("validation.local_field_required") })
      .min(1, t("validation.local_field_required")),
    ecclesiastical_year_id: z.coerce
      .number({ error: t("validation.year_required") })
      .min(1, t("validation.year_required")),
    submission_deadline: z.string().min(1, t("validation.submission_deadline_required")),
    investiture_date: z.string().min(1, t("validation.investiture_date_required")),
  });
}

type FormValues = {
  local_field_id: number;
  ecclesiastical_year_id: number;
  submission_deadline: string;
  investiture_date: string;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfigFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, dialog is in edit mode */
  config?: InvestitureConfig | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfigFormDialog({
  open,
  onOpenChange,
  config,
  onSuccess,
}: ConfigFormDialogProps) {
  const t = useTranslations("investiture");
  const isEdit = !!config;
  const [localFields, setLocalFields] = useState<LocalField[]>([]);
  const [years, setYears] = useState<EcclesiasticalYear[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formSchema = useMemo(() => buildFormSchema(t), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      local_field_id: undefined,
      ecclesiastical_year_id: undefined,
      submission_deadline: "",
      investiture_date: "",
    },
  });

  // Load catalogs when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingCatalogs(true);
    Promise.all([listLocalFields(), listEcclesiasticalYears()])
      .then(([fields, ecclesiasticalYears]) => {
        const fieldsArr = Array.isArray(fields) ? fields : [];
        const yearsArr = Array.isArray(ecclesiasticalYears) ? ecclesiasticalYears : [];
        setLocalFields(fieldsArr);
        setYears(yearsArr);
      })
      .catch(() => toast.error(t("toasts.catalogs_load_failed")))
      .finally(() => setLoadingCatalogs(false));
  }, [open]);

  // Reset form when dialog opens or config changes
  useEffect(() => {
    if (open) {
      form.reset({
        local_field_id: config?.local_field_id ?? undefined,
        ecclesiastical_year_id: config?.ecclesiastical_year_id ?? undefined,
        submission_deadline: config?.submission_deadline
          ? config.submission_deadline.split("T")[0]
          : "",
        investiture_date: config?.investiture_date
          ? config.investiture_date.split("T")[0]
          : "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, config]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      if (isEdit && config) {
        const payload: UpdateInvestitureConfigPayload = {
          submission_deadline: values.submission_deadline,
          investiture_date: values.investiture_date,
        };
        await updateInvestitureConfig(config.investiture_config_id, payload);
        toast.success(t("toasts.config_updated"));
      } else {
        const payload: CreateInvestitureConfigPayload = {
          local_field_id: values.local_field_id,
          ecclesiastical_year_id: values.ecclesiastical_year_id,
          submission_deadline: values.submission_deadline,
          investiture_date: values.investiture_date,
        };
        await createInvestitureConfig(payload);
        toast.success(t("toasts.config_created"));
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : isEdit
            ? t("errors.config_update")
            : t("errors.config_create");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar configuración" : "Nueva configuración"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modificá las fechas de la configuración de investidura."
              : "Configurá las fechas para un campo local y año eclesiástico."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Campo Local — solo al crear */}
            {!isEdit && (
              <FormField
                control={form.control}
                name="local_field_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Campo Local <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value?.toString() ?? ""}
                        onValueChange={(v) => field.onChange(Number(v))}
                        disabled={loadingCatalogs}
                      >
                        <SelectTrigger aria-required="true">
                          <SelectValue
                            placeholder={
                              loadingCatalogs ? "Cargando campos..." : "Seleccioná un campo local"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {localFields.map((lf) => (
                            <SelectItem
                              key={lf.local_field_id}
                              value={lf.local_field_id.toString()}
                            >
                              {lf.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Año Eclesiástico — solo al crear */}
            {!isEdit && (
              <FormField
                control={form.control}
                name="ecclesiastical_year_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Año Eclesiástico <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value?.toString() ?? ""}
                        onValueChange={(v) => field.onChange(Number(v))}
                        disabled={loadingCatalogs}
                      >
                        <SelectTrigger aria-required="true">
                          <SelectValue
                            placeholder={
                              loadingCatalogs ? "Cargando años..." : "Seleccioná un año"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem
                              key={year.ecclesiastical_year_id}
                              value={year.ecclesiastical_year_id.toString()}
                            >
                              {year.name}
                              {year.active && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  (activo)
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Fecha límite de envío */}
            <FormField
              control={form.control}
              name="submission_deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Límite de Envío <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha de investidura */}
            <FormField
              control={form.control}
              name="investiture_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Fecha de Investidura <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || loadingCatalogs}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isEdit ? "Guardar cambios" : "Crear configuración"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
