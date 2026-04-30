"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeightSumIndicator } from "./weight-sum-indicator";
import {
  createMemberRankingWeights,
  updateMemberRankingWeights,
  mapWeightsErrorMessage,
} from "@/lib/api/member-ranking-weights";
import type { EnrollmentRankingWeight } from "@/lib/api/member-ranking-weights";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z
  .object({
    class_pct: z.coerce
      .number()
      .min(0, "Minimo 0")
      .max(100, "Maximo 100"),
    investiture_pct: z.coerce
      .number()
      .min(0, "Minimo 0")
      .max(100, "Maximo 100"),
    camporee_pct: z.coerce
      .number()
      .min(0, "Minimo 0")
      .max(100, "Maximo 100"),
    /** "all" means null (applies to all club types) */
    club_type_id: z.string(),
    /** "all" means null (applies to all years) */
    ecclesiastical_year_id: z.string(),
  })
  .refine(
    (data) =>
      Math.abs(data.class_pct + data.investiture_pct + data.camporee_pct - 100) <=
      0.01,
    {
      message: "La suma de los porcentajes debe ser exactamente 100",
      path: ["camporee_pct"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeightsFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog operates in edit mode. */
  editingRow?: EnrollmentRankingWeight | null;
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToDefaultValues(row: EnrollmentRankingWeight): FormValues {
  return {
    class_pct: row.class_pct,
    investiture_pct: row.investiture_pct,
    camporee_pct: row.camporee_pct,
    club_type_id:
      row.club_type_id !== null ? String(row.club_type_id) : "all",
    ecclesiastical_year_id:
      row.ecclesiastical_year_id !== null
        ? String(row.ecclesiastical_year_id)
        : "all",
  };
}

const EMPTY_DEFAULTS: FormValues = {
  class_pct: 0,
  investiture_pct: 0,
  camporee_pct: 0,
  club_type_id: "all",
  ecclesiastical_year_id: "all",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function WeightsFormDialog({
  open,
  onOpenChange,
  editingRow,
  clubTypes,
  ecclesiasticalYears,
  onSuccess,
}: WeightsFormDialogProps) {
  const isEdit = !!editingRow;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    // z.coerce.number() splits Zod's input/output types (string-ish in, number out),
    // so zodResolver's inferred Resolver type doesn't match useForm<FormValues>'s
    // unified signature. Cast is safe because runtime behavior is identical.
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: EMPTY_DEFAULTS,
  });

  const classPct = watch("class_pct");
  const investiturePct = watch("investiture_pct");
  const camporeePct = watch("camporee_pct");
  const clubTypeValue = watch("club_type_id");
  const yearValue = watch("ecclesiastical_year_id");

  useEffect(() => {
    if (open) {
      reset(editingRow ? rowToDefaultValues(editingRow) : EMPTY_DEFAULTS);
    }
  }, [open, editingRow, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const payload = {
        class_pct: values.class_pct,
        investiture_pct: values.investiture_pct,
        camporee_pct: values.camporee_pct,
        club_type_id:
          values.club_type_id === "all" ? null : Number(values.club_type_id),
        ecclesiastical_year_id:
          values.ecclesiastical_year_id === "all"
            ? null
            : Number(values.ecclesiastical_year_id),
      };

      if (isEdit && editingRow) {
        await updateMemberRankingWeights(editingRow.id, payload);
        toast.success("Configuracion de pesos actualizada");
      } else {
        await createMemberRankingWeights(payload);
        toast.success("Sobreescritura de pesos creada");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(mapWeightsErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const sumValues = [
    Number.isFinite(Number(classPct)) ? Number(classPct) : 0,
    Number.isFinite(Number(investiturePct)) ? Number(investiturePct) : 0,
    Number.isFinite(Number(camporeePct)) ? Number(camporeePct) : 0,
  ];
  const sumIsValid =
    Math.abs(sumValues[0] + sumValues[1] + sumValues[2] - 100) <= 0.01;
  const submitDisabled =
    isSubmitting || !sumIsValid || (isEdit && !isDirty);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar configuracion de pesos" : "Nueva sobreescritura de pesos"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Porcentajes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="w-class">Clase (%)</Label>
              <Input
                id="w-class"
                type="number"
                step="0.01"
                min={0}
                max={100}
                {...register("class_pct")}
                placeholder="0"
              />
              {errors.class_pct && (
                <p className="text-xs text-destructive">
                  {errors.class_pct.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="w-investiture">Investidura (%)</Label>
              <Input
                id="w-investiture"
                type="number"
                step="0.01"
                min={0}
                max={100}
                {...register("investiture_pct")}
                placeholder="0"
              />
              {errors.investiture_pct && (
                <p className="text-xs text-destructive">
                  {errors.investiture_pct.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="w-camporee">Campaña (%)</Label>
              <Input
                id="w-camporee"
                type="number"
                step="0.01"
                min={0}
                max={100}
                {...register("camporee_pct")}
                placeholder="0"
              />
              {errors.camporee_pct && (
                <p className="text-xs text-destructive">
                  {errors.camporee_pct.message}
                </p>
              )}
            </div>
          </div>

          {/* Live sum indicator */}
          <div className="flex items-center gap-2">
            <WeightSumIndicator values={sumValues} />
          </div>

          {/* Tipo de club — catalog Select */}
          <div className="space-y-1.5">
            <Label>Tipo de club</Label>
            <Select
              value={clubTypeValue}
              onValueChange={(val) => setValue("club_type_id", val, { shouldDirty: true })}
              disabled={isEdit && editingRow?.is_default}
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
            {errors.club_type_id && (
              <p className="text-xs text-destructive">
                {errors.club_type_id.message}
              </p>
            )}
          </div>

          {/* Ano eclesiastico — catalog Select */}
          <div className="space-y-1.5">
            <Label>Ano eclesiastico</Label>
            <Select
              value={yearValue}
              onValueChange={(val) =>
                setValue("ecclesiastical_year_id", val, { shouldDirty: true })
              }
              disabled={isEdit && editingRow?.is_default}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los anos</SelectItem>
                {ecclesiasticalYears.map((y) => (
                  <SelectItem
                    key={y.ecclesiastical_year_id}
                    value={String(y.ecclesiastical_year_id)}
                  >
                    {y.name}
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

          {isEdit && editingRow?.is_default && (
            <p className="text-xs text-muted-foreground">
              La fila por defecto no puede cambiar su tipo de club ni ano eclesiastico.
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {isSubmitting
                ? isEdit
                  ? "Guardando..."
                  : "Creando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear sobreescritura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
