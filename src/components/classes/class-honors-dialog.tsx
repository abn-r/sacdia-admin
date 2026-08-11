"use client";

import { useState } from "react";
import { Award, Loader2, Plus, Trash2 } from "lucide-react";
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
  createClassHonor,
  deleteClassHonor,
  type ClassHonorRelation,
  type ClassHonorRelationType,
} from "@/lib/api/class-honors";
import { getClassRelationErrorMessage } from "@/lib/classes/class-relation-errors";

export type ClassHonorOption = {
  honor_id: number;
  name: string;
};

const RELATION_TYPE_ORDER: ClassHonorRelationType[] = [
  "REQUIRED",
  "RECOMMENDED",
  "ELECTIVE",
];

const RELATION_TYPE_LABELS: Record<ClassHonorRelationType, string> = {
  REQUIRED: "Requerida",
  RECOMMENDED: "Recomendada",
  ELECTIVE: "Electiva",
};

const RELATION_TYPE_BADGE_VARIANT: Record<
  ClassHonorRelationType,
  "default" | "secondary" | "outline"
> = {
  REQUIRED: "default",
  RECOMMENDED: "secondary",
  ELECTIVE: "outline",
};

type ClassHonorsDialogProps = {
  classId: number;
  initialRelations: ClassHonorRelation[];
  honorsCatalog: ClassHonorOption[];
  canCreate: boolean;
  canDelete: boolean;
};

export function ClassHonorsDialog({
  classId,
  initialRelations,
  honorsCatalog,
  canCreate,
  canDelete,
}: ClassHonorsDialogProps) {
  const [open, setOpen] = useState(false);
  const [relations, setRelations] = useState<ClassHonorRelation[]>(initialRelations);

  const [selectedHonorId, setSelectedHonorId] = useState("");
  const [relationType, setRelationType] = useState<ClassHonorRelationType>("RECOMMENDED");
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ClassHonorRelation | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const honorId = Number(selectedHonorId);
    if (!Number.isFinite(honorId) || honorId <= 0) {
      toast.error("Selecciona una especialidad.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createClassHonor(classId, {
        honor_id: honorId,
        relation_type: relationType,
      });
      setRelations((current) => [...current, created]);
      toast.success("Especialidad agregada a la clase.");
      setSelectedHonorId("");
      setRelationType("RECOMMENDED");
    } catch (error) {
      toast.error(
        getClassRelationErrorMessage(error, "No se pudo agregar la especialidad."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClassHonor(classId, deleteTarget.class_honor_id);
      setRelations((current) =>
        current.filter((relation) => relation.class_honor_id !== deleteTarget.class_honor_id),
      );
      toast.success("Especialidad eliminada de la clase.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        getClassRelationErrorMessage(error, "No se pudo eliminar la especialidad."),
      );
    } finally {
      setDeleting(false);
    }
  }

  const grouped = RELATION_TYPE_ORDER.map((type) => ({
    type,
    items: relations.filter((relation) => relation.relation_type === type),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Award className="size-4" />
        Especialidades
        {relations.length > 0 ? (
          <Badge variant="secondary" className="ml-1">
            {relations.length}
          </Badge>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Especialidades relacionadas</DialogTitle>
            <DialogDescription>
              Asocia especialidades a esta clase. La relación es informativa: no bloquea
              la investidura, incluso si es «Requerida».
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {canCreate ? (
              <form
                onSubmit={handleCreate}
                className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_160px_auto] sm:items-end"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="class-honor-select">Especialidad</Label>
                  <Select value={selectedHonorId} onValueChange={setSelectedHonorId}>
                    <SelectTrigger id="class-honor-select" className="w-full bg-background">
                      <SelectValue placeholder="Selecciona una especialidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {honorsCatalog.map((honor) => (
                        <SelectItem key={honor.honor_id} value={String(honor.honor_id)}>
                          {honor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="class-honor-relation-type">Tipo de relación</Label>
                  <Select
                    value={relationType}
                    onValueChange={(value) => setRelationType(value as ClassHonorRelationType)}
                  >
                    <SelectTrigger id="class-honor-relation-type" className="w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATION_TYPE_ORDER.map((type) => (
                        <SelectItem key={type} value={type}>
                          {RELATION_TYPE_LABELS[type]}
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

            {grouped.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Esta clase no tiene especialidades relacionadas.
              </p>
            ) : (
              <div className="space-y-4" data-testid="class-honors-list">
                {grouped.map((group) => (
                  <div key={group.type} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={RELATION_TYPE_BADGE_VARIANT[group.type]}>
                        {RELATION_TYPE_LABELS[group.type]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {group.items.length}{" "}
                        {group.items.length === 1 ? "especialidad" : "especialidades"}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {group.items.map((relation) => (
                        <li
                          key={relation.class_honor_id}
                          className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
                        >
                          <span className="text-sm font-medium">{relation.honor.name}</span>
                          {canDelete ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteTarget(relation)}
                              aria-label={`Eliminar ${relation.honor.name}`}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
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
            <AlertDialogTitle>Eliminar especialidad</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas quitar «{deleteTarget?.honor.name}» de esta clase? Puedes
              volver a agregarla más tarde si es necesario.
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
