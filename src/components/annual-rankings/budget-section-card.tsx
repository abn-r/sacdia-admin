"use client";

import { Plus, Shield, Sparkles, Trash2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormControl,
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
import { PointsAllocationBar } from "@/components/annual-rankings/points-allocation-bar";
import {
  COMPONENT_CATALOG,
  sectionMeta,
} from "@/lib/annual-rankings/ranking-config-catalog";
import type { AnnualRankingConfigFormValues } from "@/lib/annual-rankings/annual-ranking-config-validation";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  info: {
    icon: "bg-info/10 text-info",
    badge: "border-info/20 bg-info/10 text-info",
  },
  success: {
    icon: "bg-success/10 text-success",
    badge: "border-success/20 bg-success/10 text-success",
  },
} as const;

interface BudgetSectionCardProps {
  form: UseFormReturn<AnnualRankingConfigFormValues>;
  axisIndex: number;
  canRemoveSection: boolean;
  onRemoveSection: () => void;
  onAddSubsection: (componentKey: string) => void;
  onRemoveSubsection: (componentIndex: number) => void;
}

export function BudgetSectionCard({
  form,
  axisIndex,
  canRemoveSection,
  onRemoveSection,
  onAddSubsection,
  onRemoveSubsection,
}: BudgetSectionCardProps) {
  const axis = form.watch(`axes.${axisIndex}`);
  const meta = sectionMeta(axis?.axis_key ?? "");
  const styles = TONE_STYLES[meta.tone] ?? TONE_STYLES.info;
  const componentTotal = (axis?.components ?? []).reduce(
    (sum, component) => sum + Number(component.max_points || 0),
    0,
  );
  const sectionMax = Number(axis?.max_points || 0);

  const usedKeys = new Set(
    (axis?.components ?? []).map((component) => component.component_key),
  );
  const availableComponents = COMPONENT_CATALOG.filter(
    (component) =>
      component.axis_key === axis?.axis_key && !usedKeys.has(component.component_key),
  );

  const SectionIcon = meta.axis_key === "administrative" ? Shield : Sparkles;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              styles.icon,
            )}
          >
            <SectionIcon className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{meta.label}</h3>
              <Badge variant="outline" className={styles.badge}>
                Sección
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {meta.description}
            </p>
          </div>
        </div>

        {canRemoveSection && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemoveSection}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Quitar sección
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name={`axes.${axisIndex}.label`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre visible</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`axes.${axisIndex}.max_points`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Puntos de la sección</FormLabel>
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

      <div className="mt-4">
        <PointsAllocationBar
          label="Subsecciones de esta sección"
          allocated={componentTotal}
          total={sectionMax}
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Subsecciones
          </p>
          {availableComponents.length > 0 ? (
            <Select onValueChange={onAddSubsection}>
              <SelectTrigger size="sm" className="w-fit gap-1">
                <Plus className="size-3.5" />
                <SelectValue placeholder="Agregar subsección" />
              </SelectTrigger>
              <SelectContent>
                {availableComponents.map((component) => (
                  <SelectItem
                    key={component.component_key}
                    value={component.component_key}
                  >
                    {component.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs text-muted-foreground">
              Todas las subsecciones disponibles ya están agregadas
            </span>
          )}
        </div>

        <div className="space-y-2">
          {(axis?.components ?? []).map((component, componentIndex) => (
            <div
              key={`${axis?.axis_key}-${component.component_key}`}
              className="grid gap-3 rounded-xl border bg-background/80 p-3 md:grid-cols-[1fr_140px_auto]"
            >
              <FormField
                control={form.control}
                name={`axes.${axisIndex}.components.${componentIndex}.label`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Subsección</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`axes.${axisIndex}.components.${componentIndex}.max_points`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Puntos</FormLabel>
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
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRemoveSubsection(componentIndex)}
                  disabled={
                    component.component_key === "annual_evidence_folder" ||
                    (axis?.components?.length ?? 0) <= 1
                  }
                  title={
                    component.component_key === "annual_evidence_folder"
                      ? "La Carpeta Anual es obligatoria"
                      : "Quitar subsección"
                  }
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Quitar subsección</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
