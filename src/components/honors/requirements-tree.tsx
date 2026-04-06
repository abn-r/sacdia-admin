"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ListTree,
  Loader2,
  MoreHorizontal,
  MoveDown,
  MoveUp,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteRequirement,
  reorderRequirements,
  updateRequirement,
  type RequirementNode,
} from "@/lib/api/honors";
import { RequirementEditDialog } from "@/components/honors/requirement-edit-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RequirementsTreeProps {
  honorId: number;
  initialData: RequirementNode[];
  onDataChange: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(text: string, max = 80): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

/** Moves an element at `fromIndex` to `fromIndex + delta` in a copy of the array. */
function moveItem<T>(arr: T[], fromIndex: number, delta: -1 | 1): T[] {
  const next = [...arr];
  const toIndex = fromIndex + delta;
  if (toIndex < 0 || toIndex >= next.length) return next;
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return next;
}

// ─── Row component ────────────────────────────────────────────────────────────

interface RowProps {
  node: RequirementNode;
  siblings: RequirementNode[];
  siblingIndex: number;
  honorId: number;
  depth: number;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  onEdit: (node: RequirementNode) => void;
  onAddSubItem: (node: RequirementNode) => void;
  onDelete: (node: RequirementNode) => void;
  onMoveUp: (siblings: RequirementNode[], index: number) => void;
  onMoveDown: (siblings: RequirementNode[], index: number) => void;
  onToggleBoolean: (
    node: RequirementNode,
    field: "requires_evidence" | "needs_review",
    value: boolean,
  ) => void;
  togglingId: number | null;
}

function RequirementRow({
  node,
  siblings,
  siblingIndex,
  honorId,
  depth,
  expandedIds,
  onToggleExpand,
  onEdit,
  onAddSubItem,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleBoolean,
  togglingId,
}: RowProps) {
  const isExpanded = expandedIds.has(node.requirement_id);
  const isFirst = siblingIndex === 0;
  const isLast = siblingIndex === siblings.length - 1;
  const isToggling = togglingId === node.requirement_id;
  const indentPx = depth * 24;

  return (
    <>
      <TableRow className="group">
        {/* Label */}
        <TableCell className="w-[80px]">
          <div style={{ paddingLeft: `${indentPx}px` }} className="flex items-center gap-1">
            {node.has_sub_items ? (
              <button
                type="button"
                onClick={() => onToggleExpand(node.requirement_id)}
                className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none"
                aria-label={isExpanded ? "Colapsar" : "Expandir"}
              >
                {isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
            ) : (
              <span className="inline-block size-5" />
            )}
            <span className="text-xs font-mono text-muted-foreground">
              {node.display_label ?? `#${node.requirement_number}`}
            </span>
          </div>
        </TableCell>

        {/* Requirement text */}
        <TableCell className="max-w-[320px]">
          <p className="text-sm leading-snug">{truncate(node.requirement_text)}</p>
        </TableCell>

        {/* Sub-items indicator */}
        <TableCell className="w-[90px] text-center">
          {node.has_sub_items ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <ListTree className="size-3" />
              {node.children.length}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </TableCell>

        {/* Choice group */}
        <TableCell className="w-[100px] text-center">
          {node.is_choice_group ? (
            <Badge variant="outline" className="text-xs">
              {node.choice_min !== null ? `Mín. ${node.choice_min}` : "Sí"}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </TableCell>

        {/* Requires evidence — inline switch */}
        <TableCell className="w-[120px] text-center">
          <div className="flex justify-center">
            <Switch
              size="sm"
              checked={node.requires_evidence}
              disabled={isToggling}
              onCheckedChange={(v) =>
                onToggleBoolean(node, "requires_evidence", v)
              }
              aria-label="Requiere evidencia"
            />
          </div>
        </TableCell>

        {/* Needs review — inline switch */}
        <TableCell className="w-[110px] text-center">
          <div className="flex justify-center">
            <Switch
              size="sm"
              checked={node.needs_review}
              disabled={isToggling}
              onCheckedChange={(v) =>
                onToggleBoolean(node, "needs_review", v)
              }
              aria-label="Pendiente de revisión"
            />
          </div>
        </TableCell>

        {/* Actions */}
        <TableCell className="w-[100px]">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Reorder buttons */}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={isFirst}
              onClick={() => onMoveUp(siblings, siblingIndex)}
              aria-label="Subir"
            >
              <MoveUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={isLast}
              onClick={() => onMoveDown(siblings, siblingIndex)}
              aria-label="Bajar"
            >
              <MoveDown className="size-3.5" />
            </Button>

            {/* More actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Más opciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(node)}>
                  <Pencil className="mr-2 size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddSubItem(node)}>
                  <Plus className="mr-2 size-4" />
                  Agregar sub-requisito
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(node)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      {/* Render children recursively if expanded */}
      {node.has_sub_items && isExpanded &&
        node.children.map((child, childIndex) => (
          <RequirementRow
            key={child.requirement_id}
            node={child}
            siblings={node.children}
            siblingIndex={childIndex}
            honorId={honorId}
            depth={depth + 1}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onEdit={onEdit}
            onAddSubItem={onAddSubItem}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onToggleBoolean={onToggleBoolean}
            togglingId={togglingId}
          />
        ))}
    </>
  );
}

// ─── Delete confirmation dialog ────────────────────────────────────────────────

interface DeleteDialogState {
  open: boolean;
  node: RequirementNode | null;
  loading: boolean;
  error: string | null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RequirementsTree({
  honorId,
  initialData,
  onDataChange,
}: RequirementsTreeProps) {
  const [roots, setRoots] = useState<RequirementNode[]>(initialData);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    requirement: RequirementNode | null;
    parentId: number | null;
    nextNumber: number;
  }>({
    open: false,
    mode: "create",
    requirement: null,
    parentId: null,
    nextNumber: 1,
  });

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    node: null,
    loading: false,
    error: null,
  });

  // Toggling inline switch state
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // ─── Expand/collapse ──────────────────────────────────────────────────────

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ─── Open dialogs ─────────────────────────────────────────────────────────

  const handleEdit = useCallback((node: RequirementNode) => {
    setEditDialog({
      open: true,
      mode: "edit",
      requirement: node,
      parentId: node.parent_id,
      nextNumber: node.requirement_number,
    });
  }, []);

  const handleAddSubItem = useCallback(
    (parent: RequirementNode) => {
      // Expand parent so the user sees the new child immediately after refresh.
      setExpandedIds((prev) => new Set(prev).add(parent.requirement_id));
      setEditDialog({
        open: true,
        mode: "create",
        requirement: null,
        parentId: parent.requirement_id,
        nextNumber: parent.children.length + 1,
      });
    },
    [],
  );

  const handleAddRoot = useCallback(() => {
    setEditDialog({
      open: true,
      mode: "create",
      requirement: null,
      parentId: null,
      nextNumber: roots.length + 1,
    });
  }, [roots.length]);

  // Expose handleAddRoot so the parent page can call it via a ref or callback.
  // We re-assign it each render but keep it stable via callback ref in the page.

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDeleteRequest = useCallback((node: RequirementNode) => {
    setDeleteDialog({ open: true, node, loading: false, error: null });
  }, []);

  async function handleDeleteConfirm() {
    if (!deleteDialog.node) return;
    setDeleteDialog((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await deleteRequirement(deleteDialog.node.requirement_id);
      setDeleteDialog({ open: false, node: null, loading: false, error: null });
      onDataChange();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo eliminar el requisito.";
      setDeleteDialog((prev) => ({ ...prev, loading: false, error: message }));
    }
  }

  // ─── Inline boolean toggle ────────────────────────────────────────────────

  const handleToggleBoolean = useCallback(
    async (
      node: RequirementNode,
      field: "requires_evidence" | "needs_review",
      value: boolean,
    ) => {
      setTogglingId(node.requirement_id);

      // Optimistic update
      const applyOptimistic = (items: RequirementNode[]): RequirementNode[] =>
        items.map((r) => {
          if (r.requirement_id === node.requirement_id) {
            return { ...r, [field]: value };
          }
          if (r.children.length > 0) {
            return { ...r, children: applyOptimistic(r.children) };
          }
          return r;
        });
      setRoots((prev) => applyOptimistic(prev));

      try {
        await updateRequirement(node.requirement_id, { [field === "requires_evidence" ? "requiresEvidence" : "needsReview"]: value });
      } catch {
        // Rollback on failure
        const rollback = (items: RequirementNode[]): RequirementNode[] =>
          items.map((r) => {
            if (r.requirement_id === node.requirement_id) {
              return { ...r, [field]: !value };
            }
            if (r.children.length > 0) {
              return { ...r, children: rollback(r.children) };
            }
            return r;
          });
        setRoots((prev) => rollback(prev));
      } finally {
        setTogglingId(null);
      }
    },
    [],
  );

  // ─── Reorder ──────────────────────────────────────────────────────────────

  /**
   * Moves a sibling at `fromIndex` by `delta` (-1 up, +1 down).
   * Updates local state optimistically, then calls the API.
   *
   * `siblings` can be the root array or a children array — we need to know
   * whether we're working with roots or with children inside a parent, so we
   * derive that by comparing reference equality.
   */
  const handleMove = useCallback(
    async (siblings: RequirementNode[], fromIndex: number, delta: -1 | 1) => {
      const reordered = moveItem(siblings, fromIndex, delta);
      const isRootLevel = siblings === roots || !siblings[0]?.parent_id;

      if (isRootLevel) {
        // Optimistic update for roots
        setRoots(reordered);
      } else {
        // Optimistic update inside a parent's children
        const parentId = siblings[0]?.parent_id;
        setRoots((prev) =>
          prev.map((r) => {
            if (r.requirement_id === parentId) {
              return { ...r, children: reordered };
            }
            // Deep search (one extra level covers grand-children)
            const updatedChildren = r.children.map((c) => {
              if (c.requirement_id === parentId) {
                return { ...c, children: reordered };
              }
              return c;
            });
            return { ...r, children: updatedChildren };
          }),
        );
      }

      try {
        await reorderRequirements(
          honorId,
          reordered.map((r) => r.requirement_id),
        );
      } catch {
        // Revert — just trigger a full refresh from the server.
        onDataChange();
      }
    },
    [honorId, onDataChange, roots],
  );

  const handleMoveUp = useCallback(
    (siblings: RequirementNode[], index: number) => {
      void handleMove(siblings, index, -1);
    },
    [handleMove],
  );

  const handleMoveDown = useCallback(
    (siblings: RequirementNode[], index: number) => {
      void handleMove(siblings, index, 1);
    },
    [handleMove],
  );

  // ─── After successful create/edit ─────────────────────────────────────────

  function handleEditSuccess() {
    onDataChange();
  }

  // ─── Sync prop changes (e.g. after server refresh) ────────────────────────

  // When the parent refreshes and passes new initialData (after a mutation),
  // sync local roots state using a stable effect.
  useEffect(() => {
    setRoots(initialData);
  }, [initialData]);

  return (
    <div>
      {/* Expose add-root action for parent via callback prop */}
      <RequirementsTreeInner
        honorId={honorId}
        roots={roots}
        expandedIds={expandedIds}
        togglingId={togglingId}
        onToggleExpand={handleToggleExpand}
        onEdit={handleEdit}
        onAddSubItem={handleAddSubItem}
        onAddRoot={handleAddRoot}
        onDelete={handleDeleteRequest}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onToggleBoolean={handleToggleBoolean}
      />

      {/* Edit / create dialog */}
      <RequirementEditDialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog((prev) => ({ ...prev, open }))}
        mode={editDialog.mode}
        honorId={honorId}
        nextNumber={editDialog.nextNumber}
        parentId={editDialog.parentId}
        requirement={editDialog.requirement}
        onSuccess={handleEditSuccess}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!deleteDialog.loading) {
            setDeleteDialog((prev) => ({ ...prev, open, error: null }));
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 w-fit rounded-full bg-destructive/10 p-2.5">
              <AlertTriangle className="size-10 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">
              Eliminar requisito
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {deleteDialog.node && (
                <>
                  ¿Estás seguro que querés eliminar el requisito{" "}
                  <span className="font-semibold text-foreground">
                    &quot;{truncate(deleteDialog.node.requirement_text, 60)}&quot;
                  </span>
                  ?{" "}
                  {deleteDialog.node.has_sub_items && (
                    <span className="block mt-1 text-warning">
                      Este requisito tiene sub-requisitos que también serán eliminados.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteDialog.error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 mt-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <span className="text-sm text-destructive">{deleteDialog.error}</span>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDialog.loading}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteDialog.loading}
              onClick={() => void handleDeleteConfirm()}
            >
              {deleteDialog.loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-1.5" />
                  Eliminar
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Inner table (separated to allow the state wrapper to call setRoots) ────

interface InnerProps {
  honorId: number;
  roots: RequirementNode[];
  expandedIds: Set<number>;
  togglingId: number | null;
  onToggleExpand: (id: number) => void;
  onEdit: (node: RequirementNode) => void;
  onAddSubItem: (node: RequirementNode) => void;
  onAddRoot: () => void;
  onDelete: (node: RequirementNode) => void;
  onMoveUp: (siblings: RequirementNode[], index: number) => void;
  onMoveDown: (siblings: RequirementNode[], index: number) => void;
  onToggleBoolean: (
    node: RequirementNode,
    field: "requires_evidence" | "needs_review",
    value: boolean,
  ) => void;
}

function RequirementsTreeInner({
  honorId,
  roots,
  expandedIds,
  togglingId,
  onToggleExpand,
  onEdit,
  onAddSubItem,
  onAddRoot,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleBoolean,
}: InnerProps) {
  if (roots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
        <ListTree className="size-10 text-muted-foreground/40" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Sin requisitos aún</p>
          <p className="text-[13px] text-muted-foreground">
            Agregá el primer requisito para empezar a construir el árbol.
          </p>
        </div>
        <Button size="sm" onClick={onAddRoot}>
          <Plus className="size-4" />
          Agregar primer requisito
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px] text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Etiqueta
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Texto
            </TableHead>
            <TableHead className="w-[90px] text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sub-ítems
            </TableHead>
            <TableHead className="w-[100px] text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Opciones
            </TableHead>
            <TableHead className="w-[120px] text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Evidencia
            </TableHead>
            <TableHead className="w-[110px] text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Revisión
            </TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {roots.map((node, index) => (
            <RequirementRow
              key={node.requirement_id}
              node={node}
              siblings={roots}
              siblingIndex={index}
              honorId={honorId}
              depth={0}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onAddSubItem={onAddSubItem}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onToggleBoolean={onToggleBoolean}
              togglingId={togglingId}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
