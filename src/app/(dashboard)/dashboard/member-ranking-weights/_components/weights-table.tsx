"use client";

import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WeightSumIndicator } from "./weight-sum-indicator";
import type { EnrollmentRankingWeight } from "@/lib/api/member-ranking-weights";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeightsTableProps {
  items: EnrollmentRankingWeight[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  onEdit: (row: EnrollmentRankingWeight) => void;
  onDelete: (row: EnrollmentRankingWeight) => void;
  onCreate: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clubTypeLabel(id: number | null, clubTypes: ClubType[]): string {
  if (id === null) return "Todos los tipos";
  return clubTypes.find((ct) => ct.club_type_id === id)?.name ?? `Tipo ${id}`;
}

function yearLabel(
  id: number | null,
  years: EcclesiasticalYear[],
): string {
  if (id === null) return "Todos los anos";
  return years.find((y) => y.ecclesiastical_year_id === id)?.name ?? `Ano ${id}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeightsTable({
  items,
  clubTypes,
  ecclesiasticalYears,
  onEdit,
  onDelete,
  onCreate,
}: WeightsTableProps) {
  const defaultRow = items.find((r) => r.is_default) ?? null;
  const overrides = items.filter((r) => !r.is_default);

  return (
    <div className="space-y-6">
      {/* ── Default global row ─────────────────────────────────────────── */}
      {defaultRow && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Configuracion por defecto</CardTitle>
                <Badge variant="soft">Global</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(defaultRow)}
                title="Editar configuracion por defecto"
              >
                <Pencil className="size-3.5" />
                Editar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Clase</p>
                <p className="text-sm font-semibold">{defaultRow.class_pct.toFixed(2)}%</p>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Investidura</p>
                <p className="text-sm font-semibold">
                  {defaultRow.investiture_pct.toFixed(2)}%
                </p>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Campana</p>
                <p className="text-sm font-semibold">
                  {defaultRow.camporee_pct.toFixed(2)}%
                </p>
              </div>
              <div className="ml-auto">
                <WeightSumIndicator
                  values={[
                    defaultRow.class_pct,
                    defaultRow.investiture_pct,
                    defaultRow.camporee_pct,
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Overrides table ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Sobreescrituras por tipo de club / ano</h2>
            <Badge variant="secondary">{overrides.length}</Badge>
          </div>
          <Button size="sm" onClick={onCreate}>
            <Plus className="size-4" />
            Crear sobreescritura
          </Button>
        </div>

        {overrides.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">Sin sobreescrituras</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Se aplica la configuracion por defecto a todos los clubes y anos.
            </p>
            <Button size="sm" variant="outline" className="mt-4" onClick={onCreate}>
              <Plus className="size-4" />
              Crear sobreescritura
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de club</TableHead>
                  <TableHead>Ano eclesiastico</TableHead>
                  <TableHead className="text-right">Clase</TableHead>
                  <TableHead className="text-right">Investidura</TableHead>
                  <TableHead className="text-right">Campana</TableHead>
                  <TableHead className="text-center">Suma</TableHead>
                  <TableHead className="w-20 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm">
                      {clubTypeLabel(row.club_type_id, clubTypes)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {yearLabel(row.ecclesiastical_year_id, ecclesiasticalYears)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {row.class_pct.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {row.investiture_pct.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {row.camporee_pct.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-center">
                      <WeightSumIndicator
                        values={[
                          row.class_pct,
                          row.investiture_pct,
                          row.camporee_pct,
                        ]}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onEdit(row)}
                          title="Editar sobreescritura"
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onDelete(row)}
                          title="Eliminar sobreescritura"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
