"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  annualRankingConfigSchema,
  rankingTierSchema,
  type AnnualRankingConfigFormValues,
} from "@/lib/annual-rankings/annual-ranking-config-validation";
import {
  createAnnualRankingConfig,
  updateAnnualRankingConfig,
  updateRankingTier,
  type AnnualRankingConfig,
  type RankingTier,
} from "@/lib/api/annual-rankings";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";

const DEFAULT_COMPONENTS = [
  {
    component_key: "annual_folder",
    label: "Carpeta anual",
    max_points: 6000,
    sort_order: 1,
  },
  {
    component_key: "finance",
    label: "Finanzas",
    max_points: 2000,
    sort_order: 2,
  },
  {
    component_key: "camporee",
    label: "Camporee",
    max_points: 2000,
    sort_order: 3,
  },
] satisfies AnnualRankingConfigFormValues["components"];

interface AnnualRankingConfigClientPageProps {
  initialConfigs: AnnualRankingConfig[];
  initialTiers: RankingTier[];
  localFields: LocalField[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
}

function findConfig(
  configs: AnnualRankingConfig[],
  values: Pick<
    AnnualRankingConfigFormValues,
    "local_field_id" | "ecclesiastical_year_id" | "club_type_id"
  >,
) {
  return configs.find(
    (config) =>
      config.local_field_id === values.local_field_id &&
      config.ecclesiastical_year_id === values.ecclesiastical_year_id &&
      config.club_type_id === values.club_type_id,
  );
}

function toFormValues(
  config: AnnualRankingConfig | undefined,
  fallback: Pick<
    AnnualRankingConfigFormValues,
    "local_field_id" | "ecclesiastical_year_id" | "club_type_id"
  >,
): AnnualRankingConfigFormValues {
  if (config) {
    return {
      annual_ranking_config_id: config.annual_ranking_config_id,
      local_field_id: config.local_field_id,
      ecclesiastical_year_id: config.ecclesiastical_year_id,
      club_type_id: config.club_type_id,
      max_points: config.max_points,
      components: config.components.map((component, index) => ({
        component_key: component.component_key,
        label: component.label,
        max_points: component.max_points,
        sort_order: component.sort_order ?? index,
      })),
    };
  }

  return {
    ...fallback,
    max_points: 10000,
    components: DEFAULT_COMPONENTS,
  };
}

export function AnnualRankingConfigClientPage({
  initialConfigs,
  initialTiers,
  localFields,
  clubTypes,
  ecclesiasticalYears,
}: AnnualRankingConfigClientPageProps) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [tiers, setTiers] = useState(initialTiers);
  const [tierDrafts, setTierDrafts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      initialTiers.map((tier) => [tier.ranking_tier_id, tier.band_percentage]),
    ),
  );
  const [savingTierId, setSavingTierId] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const initialScope = useMemo(
    () => ({
      local_field_id: localFields[0]?.local_field_id ?? 1,
      ecclesiastical_year_id:
        ecclesiasticalYears.find((year) => year.active)?.ecclesiastical_year_id ??
        ecclesiasticalYears[0]?.ecclesiastical_year_id ??
        1,
      club_type_id: clubTypes[0]?.club_type_id ?? 1,
    }),
    [clubTypes, ecclesiasticalYears, localFields],
  );

  const form = useForm<AnnualRankingConfigFormValues>({
    resolver: zodResolver(annualRankingConfigSchema),
    defaultValues: toFormValues(
      findConfig(configs, initialScope),
      initialScope,
    ),
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "components",
  });

  const selectedLocalFieldId = form.watch("local_field_id");
  const selectedYearId = form.watch("ecclesiastical_year_id");
  const selectedClubTypeId = form.watch("club_type_id");
  const scope = useMemo(
    () => ({
      local_field_id: Number(selectedLocalFieldId),
      ecclesiastical_year_id: Number(selectedYearId),
      club_type_id: Number(selectedClubTypeId),
    }),
    [selectedClubTypeId, selectedLocalFieldId, selectedYearId],
  );

  useEffect(() => {
    const current = findConfig(configs, scope);
    form.reset(toFormValues(current, scope));
  }, [configs, form, scope]);

  const componentTotal = form
    .watch("components")
    .reduce((sum, component) => sum + Number(component.max_points || 0), 0);
  const maxPoints = Number(form.watch("max_points") || 0);
  const selectedConfigId = form.watch("annual_ranking_config_id");

  async function handleSaveConfig(values: AnnualRankingConfigFormValues) {
    setSavingConfig(true);
    try {
      const saved = values.annual_ranking_config_id
        ? await updateAnnualRankingConfig(values.annual_ranking_config_id, {
            max_points: values.max_points,
            components: values.components,
          })
        : await createAnnualRankingConfig(values);

      setConfigs((current) => {
        const exists = current.some(
          (config) =>
            config.annual_ranking_config_id === saved.annual_ranking_config_id,
        );
        return exists
          ? current.map((config) =>
              config.annual_ranking_config_id === saved.annual_ranking_config_id
                ? saved
                : config,
            )
          : [...current, saved];
      });
      form.reset(toFormValues(saved, scope));
      toast.success("Configuración anual guardada");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar";
      toast.error(message);
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleSaveTier(tier: RankingTier) {
    const draft = tierDrafts[tier.ranking_tier_id];
    const parsed = rankingTierSchema.safeParse({
      ...tier,
      band_percentage: draft,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Porcentaje inválido");
      return;
    }

    setSavingTierId(tier.ranking_tier_id);
    try {
      const updated = await updateRankingTier(tier.ranking_tier_id, {
        name: tier.name,
        band_percentage: parsed.data.band_percentage,
        color: tier.color,
        icon: tier.icon,
        sort_order: tier.sort_order,
        active: tier.active,
      });
      setTiers((current) =>
        current.map((row) =>
          row.ranking_tier_id === updated.ranking_tier_id ? updated : row,
        ),
      );
      toast.success("Rango actualizado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar";
      toast.error(message);
    } finally {
      setSavingTierId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Rangos globales de reconocimiento</CardTitle>
          <CardDescription>
            Estos porcentajes son globales. El sistema calcula los puntos mínimos
            según el máximo anual configurado por cada campo local.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rango</TableHead>
                <TableHead>Porcentaje de banda</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => (
                <TableRow key={tier.ranking_tier_id}>
                  <TableCell className="font-medium">{tier.name}</TableCell>
                  <TableCell>
                    <div className="flex max-w-40 items-center gap-2">
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={tierDrafts[tier.ranking_tier_id] ?? ""}
                        onChange={(event) =>
                          setTierDrafts((current) => ({
                            ...current,
                            [tier.ranking_tier_id]: Number(event.target.value),
                          }))
                        }
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tier.active ? "secondary" : "outline"}>
                      {tier.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingTierId === tier.ranking_tier_id}
                      onClick={() => handleSaveTier(tier)}
                    >
                      {savingTierId === tier.ranking_tier_id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Save />
                      )}
                      Guardar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Presupuesto anual por campo local</CardTitle>
          <CardDescription>
            Definí el total anual y cómo se reparte entre carpeta, finanzas,
            camporee y otros componentes para un año y tipo de club.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSaveConfig)}
              className="flex flex-col gap-5"
              noValidate
            >
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="local_field_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campo local</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
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

                <FormField
                  control={form.control}
                  name="ecclesiastical_year_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Año eclesiástico</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                      <FormLabel>Tipo de club</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
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
              </div>

              <FormField
                control={form.control}
                name="max_points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total anual de puntos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Ejemplo: 10,000 o 12,000 puntos según el campo local.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-lg border">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                  <div>
                    <h3 className="font-medium">Componentes del puntaje</h3>
                    <p className="text-sm text-muted-foreground">
                      La suma debe coincidir con el total anual.
                    </p>
                  </div>
                  <Badge
                    variant={componentTotal === maxPoints ? "secondary" : "destructive"}
                  >
                    {componentTotal.toLocaleString()} / {maxPoints.toLocaleString()}
                  </Badge>
                </div>
                <div className="divide-y">
                  {fields.map((fieldItem, index) => (
                    <div
                      key={fieldItem.id}
                      className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_160px]"
                    >
                      <FormField
                        control={form.control}
                        name={`components.${index}.label`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Etiqueta</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`components.${index}.component_key`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Clave</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`components.${index}.max_points`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Puntos</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                {...field}
                                onChange={(event) =>
                                  field.onChange(Number(event.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant={selectedConfigId ? "secondary" : "outline"}>
                  {selectedConfigId ? "Editando configuración" : "Nueva configuración"}
                </Badge>
                <Button type="submit" disabled={savingConfig}>
                  {savingConfig ? <Loader2 className="animate-spin" /> : <Save />}
                  Guardar presupuesto anual
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
