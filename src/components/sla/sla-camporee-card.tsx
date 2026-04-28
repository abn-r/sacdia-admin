"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tent, Users, CreditCard } from "lucide-react";
import type { CamporeeSummary } from "@/lib/api/analytics";

interface SlaCamporeeCardProps {
  camporee: CamporeeSummary;
}

export function SlaCamporeeCard({ camporee }: SlaCamporeeCardProps) {
  const { clubs_pending, members_pending, payments_pending } = camporee;
  const total = clubs_pending + members_pending + payments_pending;

  function badgeVariant(count: number): "secondary" | "warning" | "destructive" {
    if (count === 0) return "secondary";
    if (count < 10) return "warning";
    return "destructive";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aprobaciones de Camporee</CardTitle>
        <CardDescription>
          {total > 0
            ? `${total.toLocaleString("es-MX")} registro${total !== 1 ? "s" : ""} pendiente${total !== 1 ? "s" : ""} de aprobacion`
            : "Sin registros pendientes de aprobacion"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <Tent className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Clubes registrados</p>
              <p className="text-xs text-muted-foreground">Pendientes de aprobacion</p>
            </div>
          </div>
          <Badge variant={badgeVariant(clubs_pending)}>
            {clubs_pending.toLocaleString("es-MX")}
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <Users className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Miembros registrados</p>
              <p className="text-xs text-muted-foreground">Pendientes de aprobacion</p>
            </div>
          </div>
          <Badge variant={badgeVariant(members_pending)}>
            {members_pending.toLocaleString("es-MX")}
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <CreditCard className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Pagos registrados</p>
              <p className="text-xs text-muted-foreground">Pendientes de aprobacion</p>
            </div>
          </div>
          <Badge variant={badgeVariant(payments_pending)}>
            {payments_pending.toLocaleString("es-MX")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
