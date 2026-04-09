"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { DeleteUnitDialog } from "@/components/units/delete-unit-dialog";
import { UnitDetailPanel } from "@/components/units/unit-detail-panel";
import { listUnits } from "@/lib/api/units";
import type { Unit } from "@/lib/api/units";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function UnitsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border bg-card p-4"
        >
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface UnitsTabProps {
  clubId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnitsTab({ clubId }: UnitsTabProps) {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUnits(clubId);
      setUnits(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar las unidades";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  function handleOpenDelete(unit: Unit) {
    setDeletingUnit(unit);
    setDeleteOpen(true);
  }

  function handleDeleteSuccess() {
    setDeleteOpen(false);
    setDeletingUnit(null);
    loadUnits();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Unidades del club. Cada unidad agrupa miembros con un lider.
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href={`/dashboard/clubs/${clubId}/units/new`}>
            <Plus className="mr-1.5 size-3.5" />
            Nueva unidad
          </Link>
        </Button>
      </div>

      {/* Loading */}
      {loading && <UnitsSkeleton />}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}{" "}
          <button
            type="button"
            className="ml-2 underline underline-offset-2"
            onClick={loadUnits}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && units.length === 0 && (
        <EmptyState
          icon={Layers}
          title="Sin unidades"
          description="Este club no tiene unidades registradas. Crea la primera para comenzar a organizar a tus miembros."
        >
          <Button size="sm" asChild>
            <Link href={`/dashboard/clubs/${clubId}/units/new`}>
              <Plus className="mr-1.5 size-3.5" />
              Nueva unidad
            </Link>
          </Button>
        </EmptyState>
      )}

      {/* Units list */}
      {!loading && !error && units.length > 0 && (
        <div className="space-y-3">
          {units.map((unit) => (
            <UnitDetailPanel
              key={unit.unit_id}
              unit={unit}
              clubId={clubId}
              onEdit={(u) => {
                router.push(`/dashboard/clubs/${clubId}/units/${u.unit_id}`);
              }}
              onDelete={handleOpenDelete}
              onMembersChanged={loadUnits}
            />
          ))}
        </div>
      )}

      {/* Refreshing indicator — shows after initial load */}
      {!loading && units.length > 0 && (
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {units.length} unidades cargadas
        </div>
      )}

      {/* Delete dialog — AlertDialog is correct per design system */}
      <DeleteUnitDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        clubId={clubId}
        unit={deletingUnit}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}

// Re-export a loading indicator for Suspense boundaries if needed externally
export function UnitsTabLoading() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" />
      <span className="text-sm">Cargando unidades...</span>
    </div>
  );
}
