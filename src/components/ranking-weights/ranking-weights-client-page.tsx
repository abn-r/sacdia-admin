"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WeightsForm } from "./weights-form";
import { NewOverrideForm } from "./new-override-form";
import {
  deleteRankingWeights,
  updateRankingWeights,
  type RankingWeights,
} from "@/lib/api/ranking-weights";

// ─── Props ────────────────────────────────────────────────────────────────────

interface RankingWeightsClientPageProps {
  initial: RankingWeights[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weightSum(r: RankingWeights): number {
  return (
    r.folder_weight +
    r.finance_weight +
    r.camporee_weight +
    r.evidence_weight
  );
}

// ─── Override row actions ─────────────────────────────────────────────────────

interface OverrideRowActionsProps {
  row: RankingWeights;
  onUpdate: (updated: RankingWeights) => void;
  onDelete: (id: string) => void;
}

function OverrideRowActions({
  row,
  onUpdate,
  onDelete,
}: OverrideRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteRankingWeights(row.ranking_weight_config_id);
      toast.success("Override eliminado");
      onDelete(row.ranking_weight_config_id);
      setDeleteOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al eliminar el override";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button size="xs" variant="outline">
            Editar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar override</DialogTitle>
          </DialogHeader>
          <WeightsForm
            initial={{
              folder_weight: row.folder_weight,
              finance_weight: row.finance_weight,
              camporee_weight: row.camporee_weight,
              evidence_weight: row.evidence_weight,
            }}
            onSubmit={async (values) => {
              try {
                const updated = await updateRankingWeights(
                  row.ranking_weight_config_id,
                  values,
                );
                toast.success("Override actualizado");
                onUpdate(updated);
                setEditOpen(false);
              } catch (err: unknown) {
                const message =
                  err instanceof Error
                    ? err.message
                    : "Error al actualizar el override";
                toast.error(message);
                throw err;
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <Button
          size="xs"
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
        >
          Eliminar
        </Button>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar override?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El tipo de club volverá a usar
              los pesos del default global.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RankingWeightsClientPage({
  initial,
}: RankingWeightsClientPageProps) {
  const [rows, setRows] = useState<RankingWeights[]>(initial);
  const [newOverrideOpen, setNewOverrideOpen] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const def = rows.find((r) => r.club_type_id === null);
  const overrides = rows.filter((r) => r.club_type_id !== null);

  async function handleRefresh() {
    startTransition(() => router.refresh());
    setNewOverrideOpen(false);
  }

  function handleUpdate(updated: RankingWeights) {
    setRows((rs) =>
      rs.map((r) =>
        r.ranking_weight_config_id === updated.ranking_weight_config_id
          ? updated
          : r,
      ),
    );
  }

  function handleDelete(id: string) {
    setRows((rs) => rs.filter((r) => r.ranking_weight_config_id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Default global */}
      <Card>
        <CardHeader>
          <CardTitle>Default global</CardTitle>
          <CardDescription>
            Pesos aplicados a todos los tipos de club que no tienen un override
            configurado. La suma debe ser exactamente 100.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {def ? (
            <WeightsForm
              initial={{
                folder_weight: def.folder_weight,
                finance_weight: def.finance_weight,
                camporee_weight: def.camporee_weight,
                evidence_weight: def.evidence_weight,
              }}
              onSubmit={async (values) => {
                try {
                  const updated = await updateRankingWeights(
                    def.ranking_weight_config_id,
                    values,
                  );
                  toast.success("Default global actualizado");
                  handleUpdate(updated);
                } catch (err: unknown) {
                  const message =
                    err instanceof Error
                      ? err.message
                      : "Error al actualizar el default";
                  toast.error(message);
                  throw err;
                }
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Default global no encontrado. Contacta al administrador del
              sistema.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Overrides table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Overrides por tipo de club</CardTitle>
            <CardDescription>
              Pesos específicos que reemplazan el default para un tipo de club
              determinado.
            </CardDescription>
          </div>
          <Dialog open={newOverrideOpen} onOpenChange={setNewOverrideOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus />
                Agregar override
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo override</DialogTitle>
              </DialogHeader>
              <NewOverrideForm
                existingClubTypeIds={overrides
                  .map((o) => o.club_type_id)
                  .filter((n): n is number => n != null)}
                onCreated={handleRefresh}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay overrides configurados. Todos los tipos de club usan el
              default global.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de club</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead>Finance</TableHead>
                  <TableHead>Camporee</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Suma</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((r) => {
                  const sum = weightSum(r);
                  return (
                    <TableRow key={r.ranking_weight_config_id}>
                      <TableCell className="font-medium">
                        {r.club_type_id}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {r.folder_weight}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {r.finance_weight}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {r.camporee_weight}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {r.evidence_weight}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={sum === 100 ? "soft-success" : "destructive"}
                          className="font-mono tabular-nums"
                        >
                          {sum}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <OverrideRowActions
                          row={r}
                          onUpdate={handleUpdate}
                          onDelete={handleDelete}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
