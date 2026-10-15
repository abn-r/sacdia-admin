"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  MapPin,
  Plus,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  FormModalBody,
  FormModalFooter,
  FormModalSteps,
  useFormModal,
} from "@/components/shared/form-modal";
import { BudgetSectionCard } from "@/components/annual-rankings/budget-section-card";
import { PointsAllocationBar } from "@/components/annual-rankings/points-allocation-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  annualRankingConfigSchema,
  type AnnualRankingConfigFormValues,
} from "@/lib/annual-rankings/annual-ranking-config-validation";
import {
  COMPONENT_CATALOG,
  SECTION_CATALOG,
  defaultSubsectionForSection,
} from "@/lib/annual-rankings/ranking-config-catalog";
import {
  buildInitialScope,
  toFormValues,
  type RankingScopeType,
} from "@/lib/annual-rankings/annual-ranking-config-utils";
import {
  createAnnualRankingConfig,
  updateAnnualRankingConfig,
  type AnnualRankingConfig,
} from "@/lib/api/annual-rankings";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";

const ROUTE_BASE = "/dashboard/annual-folders/ranking-config";

/** Fields validated before leaving the scope step (modal layout). */
const SCOPE_STEP_FIELDS = [
  "scope_type",
  "union_id",
  "local_field_id",
  "ecclesiastical_year_id",
  "club_type_id",
  "max_points",
] as const;

interface AnnualBudgetConfigFormProps {
  mode: "create" | "edit";
  config?: AnnualRankingConfig;
  unions: Union[];
  localFields: LocalField[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  /**
   * `modal`: two-step form inside `RouteFormModal` (create route).
   * `page`: single full-page form (edit route).
   */
  layout?: "page" | "modal";
}

export function AnnualBudgetConfigForm({
  mode,
  config,
  unions,
  localFields,
  clubTypes,
  ecclesiasticalYears,
  layout = "page",
}: AnnualBudgetConfigFormProps) {
  const t = useTranslations("annual_folders.budgetConfigForm");
  const tModal = useTranslations("shared.formModal");
  const modal = useFormModal(ROUTE_BASE);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [savingConfig, setSavingConfig] = useState(false);
  const isEdit = mode === "edit";

  const initialScope = useMemo(
    () =>
      config
        ? {
            scope_type: (config.union_id != null
              ? "union"
              : "local_field") as RankingScopeType,
            union_id: config.union_id,
            local_field_id: config.local_field_id,
            ecclesiastical_year_id: config.ecclesiastical_year_id,
            club_type_id: config.club_type_id,
          }
        : buildInitialScope(
            unions,
            localFields,
            clubTypes,
            ecclesiasticalYears,
          ),
    [clubTypes, config, ecclesiasticalYears, localFields, unions],
  );

  const form = useForm<AnnualRankingConfigFormValues>({
    resolver: zodResolver(annualRankingConfigSchema),
    defaultValues: toFormValues(config, initialScope),
  });

  const { fields: axisFields, append, remove } = useFieldArray({
    control: form.control,
    name: "axes",
  });

  const selectedScopeType = form.watch("scope_type");
  const axes = form.watch("axes");
  const axisTotal = axes.reduce(
    (sum, axis) => sum + Number(axis.max_points || 0),
    0,
  );
  const maxPoints = Number(form.watch("max_points") || 0);
  const annualFolderPoints =
    axes
      .flatMap((axis) => axis.components)
      .find(
        (component) => component.component_key === "annual_evidence_folder",
      )?.max_points ?? 0;

  const usedSectionKeys = new Set(axes.map((axis) => axis.axis_key));
  const availableSections = SECTION_CATALOG.filter(
    (section) => !usedSectionKeys.has(section.axis_key),
  );

  async function handleSaveConfig(values: AnnualRankingConfigFormValues) {
    setSavingConfig(true);
    try {
      if (values.annual_ranking_config_id) {
        await updateAnnualRankingConfig(values.annual_ranking_config_id, {
          max_points: values.max_points,
          axes: values.axes,
        });
        toast.success("Configuración actualizada correctamente");
      } else {
        await createAnnualRankingConfig(values);
        toast.success("Configuración creada correctamente");
      }
      modal.complete();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar";
      toast.error(message);
    } finally {
      setSavingConfig(false);
    }
  }

  function addSection() {
    const nextSection = availableSections[0];
    if (!nextSection) {
      toast.error("Ya agregaste todas las secciones disponibles.");
      return;
    }

    const defaultComponent = defaultSubsectionForSection(nextSection.axis_key);
    if (!defaultComponent) {
      toast.error("No hay subsecciones disponibles para esta sección.");
      return;
    }

    append({
      axis_key: nextSection.axis_key,
      label: nextSection.label,
      max_points: 1,
      sort_order: axes.length + 1,
      components: [defaultComponent],
    });
  }

  function removeSection(axisIndex: number) {
    const axis = axes[axisIndex];
    if (!axis) return;

    if (axes.length <= 1) {
      toast.error("Debe existir al menos una sección.");
      return;
    }

    if (axis.axis_key === "administrative") {
      toast.error(
        "La sección administrativa no se puede quitar porque incluye la Carpeta Anual.",
      );
      return;
    }

    remove(axisIndex);
  }

  function addSubsection(axisIndex: number, componentKey: string) {
    const axis = form.getValues(`axes.${axisIndex}`);
    const catalogItem = COMPONENT_CATALOG.find(
      (component) => component.component_key === componentKey,
    );
    if (!catalogItem || catalogItem.axis_key !== axis.axis_key) return;

    form.setValue(
      `axes.${axisIndex}.components`,
      [
        ...axis.components,
        {
          component_key: catalogItem.component_key,
          label: catalogItem.label,
          max_points: 1,
          sort_order: axis.components.length + 1,
        },
      ],
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function removeSubsection(axisIndex: number, componentIndex: number) {
    const components = form.getValues(`axes.${axisIndex}.components`);
    const component = components[componentIndex];

    if (component?.component_key === "annual_evidence_folder") {
      toast.error(
        "La Carpeta Anual no se puede quitar: define el total de las plantillas.",
      );
      return;
    }

    if (components.length <= 1) {
      toast.error("Cada sección debe tener al menos una subsección.");
      return;
    }

    form.setValue(
      `axes.${axisIndex}.components`,
      components.filter((_, index) => index !== componentIndex),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  const scopeFields = (
    <>
      <FormField
        control={form.control}
        name="scope_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              Alcance
            </FormLabel>
            <Select
              value={field.value}
              disabled={isEdit}
              onValueChange={(value: RankingScopeType) => {
                field.onChange(value);
                if (value === "union" && !form.getValues("union_id")) {
                  form.setValue("union_id", unions[0]?.union_id ?? null);
                }
                if (
                  value === "local_field" &&
                  !form.getValues("local_field_id")
                ) {
                  form.setValue(
                    "local_field_id",
                    localFields[0]?.local_field_id ?? null,
                  );
                }
              }}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar alcance" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {unions.length > 0 && (
                  <SelectItem value="union">Unión</SelectItem>
                )}
                {localFields.length > 0 && (
                  <SelectItem value="local_field">Campo Local</SelectItem>
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedScopeType === "union" ? (
        <FormField
          control={form.control}
          name="union_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                Unión
              </FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(value) => field.onChange(Number(value))}
                disabled={isEdit || unions.length <= 1}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar unión" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {unions.map((union) => (
                    <SelectItem
                      key={union.union_id}
                      value={String(union.union_id)}
                    >
                      {union.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          control={form.control}
          name="local_field_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                Campo local
              </FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(value) => field.onChange(Number(value))}
                disabled={isEdit || localFields.length <= 1}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar campo local" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {localFields.map((fieldOption) => (
                    <SelectItem
                      key={fieldOption.local_field_id}
                      value={String(fieldOption.local_field_id)}
                    >
                      {fieldOption.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="ecclesiastical_year_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Año eclesiástico
            </FormLabel>
            <Select
              value={String(field.value)}
              onValueChange={(value) => field.onChange(Number(value))}
              disabled={isEdit || ecclesiasticalYears.length <= 1}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ecclesiasticalYears.map((year) => (
                  <SelectItem
                    key={year.ecclesiastical_year_id}
                    value={String(year.ecclesiastical_year_id)}
                  >
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="club_type_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              Tipo de club
            </FormLabel>
            <Select
              value={String(field.value)}
              onValueChange={(value) => field.onChange(Number(value))}
              disabled={isEdit || clubTypes.length <= 1}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {clubTypes.map((type) => (
                  <SelectItem
                    key={type.club_type_id}
                    value={String(type.club_type_id)}
                  >
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  const maxPointsField = (
    <FormField
      control={form.control}
      name="max_points"
      render={({ field }) => (
        <FormItem className="max-w-xs">
          <FormLabel>Total de puntos</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={1}
              className="text-lg font-semibold tabular-nums"
              {...field}
              onChange={(event) =>
                field.onChange(Number(event.target.value))
              }
            />
          </FormControl>
          <FormDescription>
            Ejemplo: 10,000 o 12,000 según tu campo.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const allocationBar = (
    <PointsAllocationBar
      label={t("sectionsAllocationLabel")}
      allocated={axisTotal}
      total={maxPoints}
    />
  );

  const addSectionButton = (
    <>
      {availableSections.length > 0 && (
        <Button type="button" variant="outline" onClick={addSection}>
          <Plus className="size-4" />
          Agregar sección
        </Button>
      )}
    </>
  );

  const axesError = (
    <>
      {form.formState.errors.axes?.message && (
        <p className="text-sm text-destructive">
          {form.formState.errors.axes.message}
        </p>
      )}
    </>
  );

  const sectionCards = (
    <div className="space-y-4">
      {axisFields.map((axisField, axisIndex) => (
        <BudgetSectionCard
          key={axisField.id}
          form={form}
          axisIndex={axisIndex}
          canRemoveSection={axes.length > 1}
          onRemoveSection={() => removeSection(axisIndex)}
          onAddSubsection={(componentKey) =>
            addSubsection(axisIndex, componentKey)
          }
          onRemoveSubsection={(componentIndex) =>
            removeSubsection(axisIndex, componentIndex)
          }
        />
      ))}
    </div>
  );

  const balanceBadge = (
    <Badge
      variant={axisTotal === maxPoints ? "soft-success" : "soft-warning"}
    >
      {axisTotal === maxPoints
        ? "Puntos balanceados"
        : "Puntos desbalanceados"}
    </Badge>
  );

  const annualFolderHint = (
    <>
      La Carpeta Anual tomará{" "}
      <strong>{Number(annualFolderPoints).toLocaleString("es-MX")} pts</strong>{" "}
      de este presupuesto.
    </>
  );

  async function goNext() {
    const valid = await form.trigger([...SCOPE_STEP_FIELDS]);
    if (!valid) return;
    setDirection("forward");
    setStep(1);
  }

  function goBack() {
    setDirection("back");
    setStep(0);
  }

  // Errors on scope / total fields after the final submit jump back to step 1.
  function onInvalid(errors: FieldErrors<AnnualRankingConfigFormValues>) {
    if (step !== 0 && SCOPE_STEP_FIELDS.some((name) => errors[name])) {
      goBack();
    }
  }

  // Enter on the first step advances instead of submitting.
  function handleModalSubmit(event: FormEvent<HTMLFormElement>) {
    if (step === 0) {
      event.preventDefault();
      void goNext();
      return;
    }
    void form.handleSubmit(handleSaveConfig, onInvalid)(event);
  }

  if (layout === "modal") {
    const steps = [t("steps.scope"), t("steps.sections")];
    return (
      <Form {...form}>
        <form onSubmit={handleModalSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <FormModalSteps steps={steps} current={step} />
          <FormModalBody stepKey={step} direction={direction}>
            {step === 0 ? (
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                {scopeFields}
                {maxPointsField}
                <p className="text-sm text-muted-foreground sm:col-span-2">{annualFolderHint}</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-3">
                  {allocationBar}
                  {balanceBadge}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium">Secciones y subsecciones</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Asigna puntos a cada subsección hasta completar el total de su sección.
                    </p>
                  </div>
                  {addSectionButton}
                </div>
                {axesError}
                {sectionCards}
              </div>
            )}
          </FormModalBody>
          <FormModalFooter step={step} total={steps.length}>
            {step === 0 ? (
              <Button type="button" variant="outline" onClick={modal.close}>
                Cancelar
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={goBack} disabled={savingConfig}>
                {tModal("back")}
              </Button>
            )}
            {step === 0 ? (
              <Button type="submit">{tModal("continue")}</Button>
            ) : (
              <Button loading={savingConfig} type="submit">
                <Save />
                {isEdit ? "Guardar cambios" : "Crear configuración"}
              </Button>
            )}
          </FormModalFooter>
        </form>
      </Form>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <a href={ROUTE_BASE}>
          <ArrowLeft className="size-4" />
          Volver al listado
        </a>
      </Button>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSaveConfig)}
          className="flex flex-col gap-6"
          noValidate
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isEdit ? "Editar configuración" : "Nueva configuración"}
              </CardTitle>
              <CardDescription>
                Define el alcance, el puntaje máximo y cómo se distribuye entre
                secciones y subsecciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {scopeFields}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Puntaje máximo anual</CardTitle>
              <CardDescription>{annualFolderHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {maxPointsField}

              {allocationBar}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  Secciones y subsecciones
                </h2>
                <p className="text-sm text-muted-foreground">
                  Asigna puntos a cada subsección hasta completar el total de su
                  sección.
                </p>
              </div>
              {addSectionButton}
            </div>

            {axesError}

            {sectionCards}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
            {balanceBadge}
            <div className="flex gap-2">
              <Button type="button" variant="outline" asChild>
                <a href={ROUTE_BASE}>Cancelar</a>
              </Button>
              <Button loading={savingConfig} type="submit">
                <Save />
                {isEdit ? "Guardar cambios" : "Crear configuración"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
