"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Paperclip, X } from "lucide-react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTranslations } from "next-intl";
import { createInsurance, updateInsurance, INSURANCE_TYPE_LABELS } from "@/lib/api/insurance";
import type { MemberInsurance, InsuranceType } from "@/lib/api/insurance";

// ─── Schema factory ───────────────────────────────────────────────────────────

const INSURANCE_TYPES: InsuranceType[] = [
  "GENERAL_ACTIVITIES",
  "CAMPOREE",
  "HIGH_RISK",
];

function buildSchema(t: ReturnType<typeof useTranslations<"insurance.validation">>) {
  return z.object({
    insurance_type: z.enum(["GENERAL_ACTIVITIES", "CAMPOREE", "HIGH_RISK"]),
    start_date: z.string().min(1, t("start_date_required")),
    end_date: z.string().min(1, t("end_date_required")),
    policy_number: z.string().optional(),
    provider: z.string().optional(),
    coverage_amount: z.coerce.number().min(0).optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

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
  const t = useTranslations("insurance");
  const tVal = useTranslations("insurance.validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const schema = useMemo(() => buildSchema(tVal), [tVal]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as z.ZodType<FormValues, FormValues>),
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
        form.reset({
          insurance_type: (ins.insurance_type ?? "GENERAL_ACTIVITIES") as InsuranceType,
          start_date: toDateInputValue(ins.start_date),
          end_date: toDateInputValue(ins.end_date),
          policy_number: ins.policy_number ?? "",
          provider: ins.provider ?? "",
          coverage_amount: ins.coverage_amount ?? undefined,
        });
      } else {
        form.reset({
          insurance_type: "GENERAL_ACTIVITIES",
          start_date: "",
          end_date: "",
          policy_number: "",
          provider: "",
          coverage_amount: undefined,
        });
      }
    }
  }, [open, ins, form]);

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
        toast.success(t("toasts.updated"));
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
        toast.success(t("toasts.created"));
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.save_failed");
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
            {isEdit ? "Editar seguro" : "Registrar seguro"}
          </DialogTitle>
          <DialogDescription>
            {member
              ? `Miembro: ${memberFullName(member)}`
              : isEdit
                ? "Modificá los datos de la póliza de seguro."
                : "Completá el formulario para registrar una nueva póliza de seguro."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Tipo de seguro */}
            <FormField
              control={form.control}
              name="insurance_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tipo de seguro{" "}
                    <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(val) => field.onChange(val as InsuranceType)}
                  >
                    <FormControl>
                      <SelectTrigger aria-required="true">
                        <SelectValue placeholder={t("placeholders.selectType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INSURANCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {INSURANCE_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Número de póliza */}
            <FormField
              control={form.control}
              name="policy_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° de póliza</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("placeholders.policyNumber")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Aseguradora */}
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aseguradora</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("placeholders.provider")}
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
                      Fecha de inicio{" "}
                      <span aria-hidden="true" className="text-destructive">*</span>
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

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Fecha de vencimiento{" "}
                      <span aria-hidden="true" className="text-destructive">*</span>
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
            </div>

            {/* Monto de cobertura */}
            <FormField
              control={form.control}
              name="coverage_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto de cobertura</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder={t("placeholders.amount")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Evidencia — unmanaged by RHF; file input stays as-is */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium leading-none">Evidencia documental</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <Paperclip aria-hidden="true" className="size-3.5" />
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
                      <X aria-hidden="true" className="size-3" />
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
