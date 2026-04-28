"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Award } from "lucide-react";
import type { ValidationSummary } from "@/lib/api/analytics";

interface SlaValidationCardProps {
  validation: ValidationSummary;
}

export function SlaValidationCard({ validation }: SlaValidationCardProps) {
  const { class_sections_pending, honors_pending, total_pending } = validation;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cola de Validacion</CardTitle>
        <CardDescription>
          {total_pending > 0
            ? `${total_pending.toLocaleString("es-MX")} item${total_pending !== 1 ? "s" : ""} esperando validacion`
            : "Sin items pendientes de validacion"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <GraduationCap className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Secciones de Clase</p>
              <p className="text-xs text-muted-foreground">Progreso pendiente de validar</p>
            </div>
          </div>
          <Badge
            variant={class_sections_pending === 0 ? "secondary" : class_sections_pending < 10 ? "warning" : "destructive"}
          >
            {class_sections_pending.toLocaleString("es-MX")}
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <Award className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Especialidades</p>
              <p className="text-xs text-muted-foreground">Honores pendientes de validar</p>
            </div>
          </div>
          <Badge
            variant={honors_pending === 0 ? "secondary" : honors_pending < 10 ? "warning" : "destructive"}
          >
            {honors_pending.toLocaleString("es-MX")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
