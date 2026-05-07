"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { WeightsTable } from "./weights-table";
import {
  deleteMemberRankingWeights,
  mapWeightsErrorMessage,
} from "@/lib/api/member-ranking-weights";
import type { EnrollmentRankingWeight } from "@/lib/api/member-ranking-weights";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeightsClientPageProps {
  initialData: EnrollmentRankingWeight[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeightsClientPage({
  initialData,
  clubTypes,
  ecclesiasticalYears,
}: WeightsClientPageProps) {
  const router = useRouter();

  // ── Delete dialog state ───────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<EnrollmentRankingWeight | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Refresh after delete ──────────────────────────────────────────────────
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  // ── Delete ────────────────────────────────────────────────────────────────
  function handleDelete(row: EnrollmentRankingWeight) {
    setDeletingRow(row);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingRow) return;
    setIsDeleting(true);
    try {
      await deleteMemberRankingWeights(deletingRow.id);
      toast.success("Sobreescritura eliminada");
      setDeleteOpen(false);
      setDeletingRow(null);
      refresh();
    } catch (err: unknown) {
      toast.error(mapWeightsErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <WeightsTable
        items={initialData}
        clubTypes={clubTypes}
        ecclesiasticalYears={ecclesiasticalYears}
        onDelete={handleDelete}
      />

      {/* Delete confirmation — AlertDialog per design system */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar sobreescritura de pesos</AlertDialogTitle>
            <AlertDialogDescription>
              Los cálculos de ranking que usaban esta configuración volverán a usar
              la configuración por defecto global. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
