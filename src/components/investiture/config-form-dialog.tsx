"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const formSchema = z.object({
  local_field_id: z.coerce
    .number({ error: "Seleccioná un campo local" })
    .min(1, "Seleccioná un campo local"),
  ecclesiastical_year_id: z.coerce
    .number({ error: "Seleccioná un año eclesiástico" })
    .min(1, "Seleccioná un año eclesiástico"),
  submission_deadline: z.string().min(1, "Ingresá la fecha límite de envío"),
  investiture_date: z.string().min(1, "Ingresá la fecha de investidura"),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigFormDialogProps {
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
  const isEdit = !!config;
  const [localFields, setLocalFields] = useState<LocalField[]>([]);
  const [years, setYears] = useState<EcclesiasticalYear[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
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
      .catch(() => toast.error("No se pudieron cargar los catálogos"))
      .finally(() => setLoadingCatalogs(false));
  }, [open]);

  // Reset form when dialog opens or config changes
  useEffect(() => {
    if (open) {
      reset({
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

  const selectedLocalFieldId = watch("local_field_id");
  const selectedYearId = watch("ecclesiastical_year_id");

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      if (isEdit && config) {
        const payload: UpdateInvestitureConfigPayload = {
          submission_deadline: values.submission_deadline,
          investiture_date: values.investiture_date,
        };
        await updateInvestitureConfig(config.investiture_config_id, payload);
        toast.success("Configuración actualizada correctamente");
      } else {
        const payload: CreateInvestitureConfigPayload = {
          local_field_id: values.local_field_id,
          ecclesiastical_year_id: values.ecclesiastical_year_id,
          submission_deadline: values.submission_deadline,
          investiture_date: values.investiture_date,
        };
        await createInvestitureConfig(payload);
        toast.success("Configuración creada correctamente");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : isEdit
            ? "No se pudo actualizar la configuración"
            : "No se pudo crear la configuración";
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Campo Local — solo al crear */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>
                Campo Local <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                value={selectedLocalFieldId?.toString() ?? ""}
                onValueChange={(v) => setValue("local_field_id", Number(v))}
                disabled={loadingCatalogs}
              >
                <SelectTrigger>
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
              {errors.local_field_id && (
                <p className="text-xs text-destructive">
                  {errors.local_field_id.message}
                </p>
              )}
            </div>
          )}

          {/* Año Eclesiástico — solo al crear */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>
                Año Eclesiástico <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                value={selectedYearId?.toString() ?? ""}
                onValueChange={(v) => setValue("ecclesiastical_year_id", Number(v))}
                disabled={loadingCatalogs}
              >
                <SelectTrigger>
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
              {errors.ecclesiastical_year_id && (
                <p className="text-xs text-destructive">
                  {errors.ecclesiastical_year_id.message}
                </p>
              )}
            </div>
          )}

          {/* Fecha límite de envío */}
          <div className="space-y-1.5">
            <Label htmlFor="submission_deadline">
              Límite de Envío <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="submission_deadline"
              type="date"
              {...register("submission_deadline")}
            />
            {errors.submission_deadline && (
              <p className="text-xs text-destructive">
                {errors.submission_deadline.message}
              </p>
            )}
          </div>

          {/* Fecha de investidura */}
          <div className="space-y-1.5">
            <Label htmlFor="investiture_date">
              Fecha de Investidura <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="investiture_date"
              type="date"
              {...register("investiture_date")}
            />
            {errors.investiture_date && (
              <p className="text-xs text-destructive">
                {errors.investiture_date.message}
              </p>
            )}
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
            <Button type="submit" disabled={isSubmitting || loadingCatalogs}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear configuración"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
