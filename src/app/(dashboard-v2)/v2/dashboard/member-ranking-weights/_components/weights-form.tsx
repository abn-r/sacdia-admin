"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { Resolver, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { Card, CardContent } from "@/components/ui/card";
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

export interface WeightsFormProps {
  mode: "create" | "edit";
  /** Required when mode === "edit" */
  defaultValues?: EnrollmentRankingWeight;
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  /** URL to redirect to on success or cancel. Defaults to /dashboard/member-ranking-weights */
  backHref?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToFormValues(row: EnrollmentRankingWeight): FormValues {
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

export function WeightsForm({
  mode,
  defaultValues,
  clubTypes,
  ecclesiasticalYears,
  backHref = "/dashboard/member-ranking-weights",
}: WeightsFormProps) {
  const isEdit = mode === "edit";
  const t = useTranslations("memberRankingWeights.formDialog");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues = isEdit && defaultValues
    ? rowToFormValues(defaultValues)
    : EMPTY_DEFAULTS;

  const form = useForm<FormValues>({
    // z.coerce.number() splits Zod's input/output types (string-ish in, number out),
    // so zodResolver's inferred Resolver type doesn't match useForm<FormValues>'s
    // unified signature. Cast is safe because runtime behavior is identical.
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: initialValues,
  });

  const isDirty = form.formState.isDirty;

  // Re-seed if the server data changes (e.g. navigating between edit pages)
  useEffect(() => {
    form.reset(isEdit && defaultValues ? rowToFormValues(defaultValues) : EMPTY_DEFAULTS);
  }, [isEdit, defaultValues, form]);

  const classPct = form.watch("class_pct");
  const investiturePct = form.watch("investiture_pct");
  const camporeePct = form.watch("camporee_pct");

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

      if (isEdit && defaultValues) {
        await updateMemberRankingWeights(defaultValues.id, payload);
        toast.success("Configuración de pesos actualizada");
      } else {
        await createMemberRankingWeights(payload);
        toast.success("Sobreescritura de pesos creada");
      }

      router.push(backHref);
      router.refresh();
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
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Porcentajes */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="class_pct"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>{t("clasePercent")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="investiture_pct"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>{t("investiduraPercent")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="camporee_pct"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>{t("campanaPercent")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Live sum indicator */}
            <div className="flex items-center gap-2">
              <WeightSumIndicator values={sumValues} />
            </div>

            {/* Tipo de club */}
            <FormField
              control={form.control}
              name="club_type_id"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Tipo de club</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(val) =>
                      form.setValue("club_type_id", val, { shouldDirty: true })
                    }
                    disabled={isEdit && defaultValues?.is_default}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo de club" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">{t("allTypes")}</SelectItem>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ano eclesiastico */}
            <FormField
              control={form.control}
              name="ecclesiastical_year_id"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>{t("anoEclesiastico")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(val) =>
                      form.setValue("ecclesiastical_year_id", val, { shouldDirty: true })
                    }
                    disabled={isEdit && defaultValues?.is_default}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar año" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">{t("allYears")}</SelectItem>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && defaultValues?.is_default && (
              <p className="text-xs text-muted-foreground">
                La fila por defecto no puede cambiar su tipo de club ni año eclesiástico.
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(backHref)}
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
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
