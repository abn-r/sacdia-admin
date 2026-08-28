"use client";

import { useState } from "react";
import { ListChecks, Loader2, Plus, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createClassPrerequisite,
  deleteClassPrerequisite,
  type ClassPrerequisiteRelation,
} from "@/lib/api/class-prerequisites";
import { getClassRelationErrorMessage } from "@/lib/classes/class-relation-errors";

export type ClassPrerequisiteOption = {
  class_id: number;
  name: string;
};

type ClassPrerequisitesDialogProps = {
  classId: number;
  initialPrerequisites: ClassPrerequisiteRelation[];
  classOptions: ClassPrerequisiteOption[];
  canCreate: boolean;
  canDelete: boolean;
};

export function ClassPrerequisitesDialog({
  classId,
  initialPrerequisites,
  classOptions,
  canCreate,
  canDelete,
}: ClassPrerequisitesDialogProps) {
  const [open, setOpen] = useState(false);
  const [prerequisites, setPrerequisites] = useState<ClassPrerequisiteRelation[]>(
    initialPrerequisites,
  );

  const [selectedClassId, setSelectedClassId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ClassPrerequisiteRelation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const availableOptions = classOptions.filter(
    (option) =>
      option.class_id !== classId &&
      !prerequisites.some((p) => p.prerequisite_class_id === option.class_id),
  );

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prerequisiteClassId = Number(selectedClassId);
    if (!Number.isFinite(prerequisiteClassId) || prerequisiteClassId <= 0) {
      toast.error("Selecciona una clase prerrequisito.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createClassPrerequisite(classId, {
        prerequisite_class_id: prerequisiteClassId,
      });
      setPrerequisites((current) => [...current, created]);
      toast.success("Prerrequisito agregado a la clase.");
      setSelectedClassId("");
    } catch (error) {
      toast.error(
        getClassRelationErrorMessage(error, "No se pudo agregar el prerrequisito."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClassPrerequisite(classId, deleteTarget.class_prerequisite_id);
      setPrerequisites((current) =>
        current.filter(
          (p) => p.class_prerequisite_id !== deleteTarget.class_prerequisite_id,
        ),
      );
      toast.success("Prerrequisito eliminado de la clase.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        getClassRelationErrorMessage(error, "No se pudo eliminar el prerrequisito."),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ListChecks className="size-4" />
        Prerrequisitos
        {prerequisites.length > 0 ? (
          <Badge variant="secondary" className="ml-1">
            {prerequisites.length}
          </Badge>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Prerrequisitos de la clase</DialogTitle>
            <DialogDescription>
              El usuario debe estar investido en cada clase prerrequisito para poder
              inscribirse en esta clase.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {canCreate ? (
              <form
                onSubmit={handleCreate}
                className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_auto] sm:items-end"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="class-prerequisite-select">Clase prerrequisito</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger id="class-prerequisite-select" className="w-full bg-background">
                      <SelectValue placeholder="Selecciona una clase" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOptions.map((option) => (
                        <SelectItem key={option.class_id} value={String(option.class_id)}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Agregar
                </Button>
              </form>
            ) : null}

            {prerequisites.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Esta clase no tiene prerrequisitos configurados.
              </p>
            ) : (
              <ul className="space-y-1.5" data-testid="class-prerequisites-list">
                {prerequisites.map((relation) => (
                  <li
                    key={relation.class_prerequisite_id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
                  >
                    <span className="text-sm font-medium">{relation.prerequisite.name}</span>
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(relation)}
                        aria-label={`Eliminar ${relation.prerequisite.name}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar prerrequisito</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas quitar «{deleteTarget?.prerequisite.name}» como
              prerrequisito de esta clase?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
