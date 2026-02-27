"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Pencil, Trash2, Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { EmptyState } from "@/components/shared/empty-state";
import type { Permission, RbacActionState } from "@/lib/rbac/types";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      {label}
    </Button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction type="submit" disabled={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      Eliminar
    </AlertDialogAction>
  );
}

type CreateAction = (prev: RbacActionState, formData: FormData) => Promise<RbacActionState>;
type UpdateAction = (id: string, prev: RbacActionState, formData: FormData) => Promise<RbacActionState>;
type DeleteAction = (formData: FormData) => Promise<void>;

interface PermissionsTableProps {
  items: Permission[];
  createAction: CreateAction;
  updateAction: UpdateAction;
  deleteAction: DeleteAction;
}

export function PermissionsTable({ items, createAction, updateAction, deleteAction }: PermissionsTableProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Permission | null>(null);
  const [deleteItem, setDeleteItem] = useState<Permission | null>(null);

  const [createState, createFormAction] = useActionState(createAction, {});

  const boundUpdateAction = editItem
    ? updateAction.bind(null, editItem.permission_id)
    : async (_: RbacActionState, __: FormData): Promise<RbacActionState> => ({ error: "No item" });

  const [updateState, updateFormAction] = useActionState(boundUpdateAction, {});

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Crear permiso
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Key} title="Sin permisos" description="No se encontraron permisos registrados.">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Crear permiso
          </Button>
        </EmptyState>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">ID</TableHead>
                <TableHead>Clave</TableHead>
                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((perm) => (
                <TableRow key={perm.permission_id}>
                  <TableCell className="text-xs text-muted-foreground">{perm.permission_id}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {perm.permission_name}
                    </code>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {perm.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={perm.active !== false ? "default" : "outline"} className="text-xs">
                      {perm.active !== false ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditItem(perm)} title="Editar">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setDeleteItem(perm)} title="Eliminar">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear permiso</DialogTitle>
            <DialogDescription>Formato: resource:action en minúsculas.</DialogDescription>
          </DialogHeader>
          <form action={createFormAction} className="space-y-4">
            {createState.error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{createState.error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="create_permission_name">Clave del permiso <span className="text-destructive">*</span></Label>
              <Input id="create_permission_name" name="permission_name" placeholder="users:create" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_description">Descripción</Label>
              <Input id="create_description" name="description" placeholder="Crear usuarios" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <SubmitButton label="Crear" />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editItem && (
        <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar permiso</DialogTitle>
            </DialogHeader>
            <form action={updateFormAction} className="space-y-4">
              {updateState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{updateState.error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit_permission_name">Clave del permiso <span className="text-destructive">*</span></Label>
                <Input id="edit_permission_name" name="permission_name" defaultValue={editItem.permission_name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">Descripción</Label>
                <Input id="edit_description" name="description" defaultValue={editItem.description ?? ""} />
              </div>
              <div className="flex items-center gap-2">
                <input type="hidden" name="active" value={editItem.active ? "on" : ""} />
                <Checkbox
                  id="edit_active"
                  defaultChecked={editItem.active}
                  onCheckedChange={(checked) => {
                    const hidden = document.querySelector('form input[name="active"]') as HTMLInputElement;
                    if (hidden) hidden.value = checked ? "on" : "";
                  }}
                />
                <Label htmlFor="edit_active">Activo</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
                <SubmitButton label="Guardar cambios" />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      {deleteItem && (
        <AlertDialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar permiso?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará el permiso <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{deleteItem.permission_name}</code>. Esta acción puede afectar roles que lo tengan asignado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={deleteItem.permission_id} />
                <DeleteButton />
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
