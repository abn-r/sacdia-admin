"use client";

import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, RefreshCw, Tent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { UnionCamporeeFormDialog } from "@/components/camporees/union-camporee-form-dialog";
import { DeleteUnionCamporeeDialog } from "@/components/camporees/delete-union-camporee-dialog";
import { listUnionCamporees } from "@/lib/api/camporees";
import type { UnionCamporee } from "@/lib/api/camporees";
import type { Union } from "@/lib/api/geography";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function extractCamporees(payload: unknown): UnionCamporee[] {
  if (Array.isArray(payload)) return payload as UnionCamporee[];
  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    if (Array.isArray(root.data)) return root.data as UnionCamporee[];
    if (root.data && typeof root.data === "object") {
      const nested = root.data as Record<string, unknown>;
      if (Array.isArray(nested.data)) return nested.data as UnionCamporee[];
    }
  }
  return [];
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface UnionCampoReesViewProps {
  initialCamporees: UnionCamporee[];
  unions: Union[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnionCampoReesView({ initialCamporees, unions }: UnionCampoReesViewProps) {
  const [camporees, setCamporees] = useState<UnionCamporee[]>(initialCamporees);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCamporee, setEditingCamporee] = useState<UnionCamporee | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCamporee, setDeletingCamporee] = useState<UnionCamporee | null>(null);

  const refreshList = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const payload = await listUnionCamporees();
      setCamporees(extractCamporees(payload));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo cargar la lista";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleEdit(camporee: UnionCamporee) {
    setEditingCamporee(camporee);
    setEditOpen(true);
  }

  function handleDelete(camporee: UnionCamporee) {
    setDeletingCamporee(camporee);
    setDeleteOpen(true);
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{camporees.length}</span>{" "}
            {camporees.length === 1 ? "camporee" : "camporees"}
          </p>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refreshList}
            disabled={isLoading}
            title="Actualizar"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">Actualizar</span>
          </Button>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nuevo camporee de unión
        </Button>
      </div>

      {/* Error */}
      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Table or empty state */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Cargando camporees...
        </div>
      ) : camporees.length === 0 ? (
        <EmptyState
          icon={Tent}
          title="No hay camporees de unión"
          description="Crea el primer camporee de unión para empezar."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Nombre
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Unión
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fecha inicio
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fecha fin
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Lugar
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Estado
                </TableHead>
                <TableHead className="h-9 w-24 px-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {camporees.map((camporee) => {
                const id = camporee.union_camporee_id ?? camporee.id ?? 0;
                return (
                  <TableRow key={id} className="hover:bg-muted/30">
                    <TableCell className="px-3 py-2.5 align-middle">
                      <span className="font-medium">{camporee.name}</span>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                      {camporee.union_name ?? "—"}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                      {formatDate(camporee.start_date)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                      {formatDate(camporee.end_date)}
                    </TableCell>
                    <TableCell className="max-w-[160px] px-3 py-2.5 align-middle">
                      <span className="truncate text-sm text-muted-foreground">
                        {camporee.place ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      <Badge
                        variant={camporee.active !== false ? "default" : "outline"}
                        className="text-xs"
                      >
                        {camporee.active !== false ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEdit(camporee)}
                          title="Editar camporee"
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(camporee)}
                          title="Eliminar camporee"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <UnionCamporeeFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        unions={unions}
        onSuccess={refreshList}
      />

      <UnionCamporeeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        camporee={editingCamporee}
        unions={unions}
        onSuccess={refreshList}
      />

      <DeleteUnionCamporeeDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        camporee={deletingCamporee}
        onSuccess={refreshList}
      />
    </div>
  );
}
