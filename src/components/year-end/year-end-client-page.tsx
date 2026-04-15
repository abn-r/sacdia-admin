"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Search, AlertTriangle, CheckCircle2, FolderOpen, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getYearEndPreview, closeYear } from "@/lib/api/year-end";
import type { YearEndPreview, YearEndCloseResult } from "@/lib/api/year-end";
import type { EcclesiasticalYear } from "@/lib/api/catalogs";

// ─── Impact card ──────────────────────────────────────────────────────────────

interface ImpactCardProps {
  icon: React.ElementType;
  label: string;
  count: number;
  description: string;
}

function ImpactCard({ icon: Icon, label, count, description }: ImpactCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{count}</p>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// ─── Result display ───────────────────────────────────────────────────────────

interface CloseResultPanelProps {
  result: YearEndCloseResult;
}

function CloseResultPanel({ result }: CloseResultPanelProps) {
  return (
    <div className="rounded-lg border border-success/20 bg-success/5 p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="space-y-2">
          <p className="font-semibold text-success">
            Año eclesiástico cerrado correctamente
          </p>
          {result.message && (
            <p className="text-sm text-success/90">{result.message}</p>
          )}
          <div className="grid grid-cols-3 gap-3 pt-1">
            {typeof result.closed_enrollments === "number" && (
              <div className="text-center">
                <p className="text-xl font-bold tabular-nums text-success">
                  {result.closed_enrollments}
                </p>
                <p className="text-xs text-success/80">Inscripciones</p>
              </div>
            )}
            {typeof result.closed_folders === "number" && (
              <div className="text-center">
                <p className="text-xl font-bold tabular-nums text-success">
                  {result.closed_folders}
                </p>
                <p className="text-xs text-success/80">Carpetas</p>
              </div>
            )}
            {typeof result.closed_reports === "number" && (
              <div className="text-center">
                <p className="text-xl font-bold tabular-nums text-success">
                  {result.closed_reports}
                </p>
                <p className="text-xs text-success/80">Reportes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface YearEndClientPageProps {
  ecclesiasticalYears: EcclesiasticalYear[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function YearEndClientPage({ ecclesiasticalYears }: YearEndClientPageProps) {
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [preview, setPreview] = useState<YearEndPreview | null>(null);
  const [closeResult, setCloseResult] = useState<YearEndCloseResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedYear = ecclesiasticalYears.find(
    (y) => String(y.ecclesiastical_year_id) === selectedYearId,
  );

  const handlePreview = useCallback(async () => {
    if (!selectedYearId) return;

    setIsPreviewing(true);
    setPreviewError(null);
    setPreview(null);
    setCloseResult(null);

    try {
      const data = await getYearEndPreview(Number(selectedYearId));
      setPreview(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo obtener la vista previa.";
      setPreviewError(message);
    } finally {
      setIsPreviewing(false);
    }
  }, [selectedYearId]);

  async function handleConfirmClose() {
    if (!selectedYearId) return;

    setIsClosing(true);
    try {
      const result = await closeYear(Number(selectedYearId));
      setCloseResult(result);
      setPreview(null);
      toast.success("Año eclesiástico cerrado correctamente");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo cerrar el año eclesiástico.";
      toast.error(message);
    } finally {
      setIsClosing(false);
      setConfirmOpen(false);
    }
  }

  function handleYearChange(value: string) {
    setSelectedYearId(value);
    setPreview(null);
    setCloseResult(null);
    setPreviewError(null);
  }

  return (
    <div className="space-y-6">
      {/* Selection card */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar año eclesiástico</CardTitle>
          <CardDescription>
            Elige el año que deseas cerrar y obtén una vista previa del impacto antes de confirmar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="year-select">Año eclesiástico</Label>
              <Select value={selectedYearId} onValueChange={handleYearChange}>
                <SelectTrigger id="year-select" className="w-full">
                  <SelectValue placeholder="Selecciona un año..." />
                </SelectTrigger>
                <SelectContent>
                  {ecclesiasticalYears.map((year) => (
                    <SelectItem
                      key={year.ecclesiastical_year_id}
                      value={String(year.ecclesiastical_year_id)}
                    >
                      {year.name}
                      {year.active && (
                        <span className="ml-2 text-xs text-muted-foreground">(activo)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!selectedYearId || isPreviewing}
            >
              <Search className="mr-2 size-4" />
              {isPreviewing ? "Cargando..." : "Vista previa"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {previewError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {previewError}
        </div>
      )}

      {/* Preview impact */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Impacto del cierre</CardTitle>
            <CardDescription>
              Los siguientes registros serán afectados al cerrar{" "}
              <span className="font-medium text-foreground">
                {selectedYear?.name ?? `Año #${selectedYearId}`}
              </span>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <ImpactCard
                icon={Users}
                label="Inscripciones"
                count={preview.enrollments_count}
                description="Se marcarán como cerradas"
              />
              <ImpactCard
                icon={FolderOpen}
                label="Carpetas"
                count={preview.folders_count}
                description="Se archivarán"
              />
              <ImpactCard
                icon={FileText}
                label="Reportes"
                count={preview.reports_count}
                description="Se cerrarán"
              />
            </div>

            <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground dark:text-warning" />
                <p className="text-sm text-warning-foreground dark:text-warning">
                  Esta acción es <strong>irreversible</strong>. Todos los registros del año serán
                  cerrados y no podrán editarse nuevamente.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
                disabled={isClosing}
              >
                <AlertTriangle className="mr-2 size-4" />
                Cerrar año
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result after close */}
      {closeResult && <CloseResultPanel result={closeResult} />}

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cerrar {selectedYear?.name ?? "año eclesiástico"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás por cerrar el año eclesiástico{" "}
              <span className="font-medium text-foreground">
                {selectedYear?.name ?? `#${selectedYearId}`}
              </span>
              . Esto afectará{" "}
              <span className="font-medium text-foreground">
                {preview?.enrollments_count ?? 0} inscripciones
              </span>
              ,{" "}
              <span className="font-medium text-foreground">
                {preview?.folders_count ?? 0} carpetas
              </span>{" "}
              y{" "}
              <span className="font-medium text-foreground">
                {preview?.reports_count ?? 0} reportes
              </span>
              . Esta acción es irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClose}
              disabled={isClosing}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isClosing ? "Cerrando..." : "Confirmar cierre"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
