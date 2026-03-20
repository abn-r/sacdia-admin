"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Paperclip, X } from "lucide-react";
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
import { createInsurance, updateInsurance, INSURANCE_TYPE_LABELS } from "@/lib/api/insurance";
import type { MemberInsurance, InsuranceType } from "@/lib/api/insurance";

// ─── Schema ───────────────────────────────────────────────────────────────────

const INSURANCE_TYPES: InsuranceType[] = [
  "GENERAL_ACTIVITIES",
  "CAMPOREE",
  "HIGH_RISK",
];

const formSchema = z.object({
  insurance_type: z.enum(["GENERAL_ACTIVITIES", "CAMPOREE", "HIGH_RISK"]),
  start_date: z.string().min(1, "La fecha de inicio es obligatoria"),
  end_date: z.string().min(1, "La fecha de fin es obligatoria"),
  policy_number: z.string().optional(),
  provider: z.string().optional(),
  coverage_amount: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  // Handle ISO strings (2025-01-01T00:00:00.000Z → 2025-01-01)
  return value.split("T")[0] ?? "";
}

function memberFullName(member: MemberInsurance): string {
  const parts = [member.name, member.paternal_last_name, member.maternal_last_name].filter(Boolean);
  return parts.join(" ") || "Sin nombre";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface InsuranceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberInsurance | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InsuranceFormDialog({
  open,
  onOpenChange,
  member,
  onSuccess,
}: InsuranceFormDialogProps) {
  const ins = member?.insurance ?? null;
  const isEdit = !!ins;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      insurance_type: "GENERAL_ACTIVITIES",
      start_date: "",
      end_date: "",
      policy_number: "",
      provider: "",
      coverage_amount: undefined,
    },
  });

  // Populate form on open
  useEffect(() => {
    if (open) {
      setEvidenceFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (ins) {
        reset({
          insurance_type: (ins.insurance_type ?? "GENERAL_ACTIVITIES") as InsuranceType,
          start_date: toDateInputValue(ins.start_date),
          end_date: toDateInputValue(ins.end_date),
          policy_number: ins.policy_number ?? "",
          provider: ins.provider ?? "",
          coverage_amount: ins.coverage_amount ?? undefined,
        });
      } else {
        reset({
          insurance_type: "GENERAL_ACTIVITIES",
          start_date: "",
          end_date: "",
          policy_number: "",
          provider: "",
          coverage_amount: undefined,
        });
      }
    }
  }, [open, ins, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!member) return;
    setIsSubmitting(true);

    try {
      if (isEdit && ins) {
        await updateInsurance(ins.insurance_id, {
          insurance_type: values.insurance_type,
          start_date: values.start_date,
          end_date: values.end_date,
          policy_number: values.policy_number || undefined,
          provider: values.provider || undefined,
          coverage_amount: values.coverage_amount,
          evidence: evidenceFile ?? undefined,
        });
        toast.success("Seguro actualizado correctamente");
      } else {
        await createInsurance(member.user_id, {
          insurance_type: values.insurance_type,
          start_date: values.start_date,
          end_date: values.end_date,
          policy_number: values.policy_number || undefined,
          provider: values.provider || undefined,
          coverage_amount: values.coverage_amount,
          evidence: evidenceFile ?? undefined,
        });
        toast.success("Seguro registrado correctamente");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al guardar el seguro";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const insuranceTypeValue = watch("insurance_type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar seguro" : "Registrar seguro"}
          </DialogTitle>
          {member && (
            <p className="text-sm text-muted-foreground">
              Miembro: <span className="font-medium text-foreground">{memberFullName(member)}</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo de seguro */}
          <div className="space-y-1.5">
            <Label>Tipo de seguro *</Label>
            <Select
              value={insuranceTypeValue}
              onValueChange={(val) => setValue("insurance_type", val as InsuranceType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {INSURANCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {INSURANCE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.insurance_type && (
              <p className="text-xs text-destructive">{errors.insurance_type.message}</p>
            )}
          </div>

          {/* Número de póliza */}
          <div className="space-y-1.5">
            <Label htmlFor="policy_number">N° de póliza</Label>
            <Input
              id="policy_number"
              {...register("policy_number")}
              placeholder="Ej. POL-2025-001"
            />
          </div>

          {/* Aseguradora */}
          <div className="space-y-1.5">
            <Label htmlFor="provider">Aseguradora</Label>
            <Input
              id="provider"
              {...register("provider")}
              placeholder="Ej. MAPFRE, San Cristóbal..."
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Fecha de inicio *</Label>
              <Input
                id="start_date"
                type="date"
                {...register("start_date")}
              />
              {errors.start_date && (
                <p className="text-xs text-destructive">{errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Fecha de vencimiento *</Label>
              <Input
                id="end_date"
                type="date"
                {...register("end_date")}
              />
              {errors.end_date && (
                <p className="text-xs text-destructive">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* Monto de cobertura */}
          <div className="space-y-1.5">
            <Label htmlFor="coverage_amount">Monto de cobertura</Label>
            <Input
              id="coverage_amount"
              type="number"
              min={0}
              step="0.01"
              {...register("coverage_amount")}
              placeholder="0.00"
            />
            {errors.coverage_amount && (
              <p className="text-xs text-destructive">{errors.coverage_amount.message}</p>
            )}
          </div>

          {/* Evidencia */}
          <div className="space-y-1.5">
            <Label>Evidencia documental</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5"
              >
                <Paperclip className="size-3.5" />
                {evidenceFile ? "Cambiar archivo" : "Adjuntar archivo"}
              </Button>
              {evidenceFile && (
                <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
                  <span className="max-w-[160px] truncate text-foreground">{evidenceFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      setEvidenceFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="size-3" />
                    <span className="sr-only">Quitar archivo</span>
                  </Button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setEvidenceFile(file);
              }}
            />
            {ins?.evidence_file_name && !evidenceFile && (
              <p className="text-xs text-muted-foreground">
                Archivo actual:{" "}
                <a
                  href={ins.evidence_file_url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {ins.evidence_file_name}
                </a>
              </p>
            )}
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP hasta 10 MB</p>
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
                  : "Registrando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Registrar seguro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
