"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Pencil, Trash2, Key, Loader2, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
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
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}

function DeleteButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction type="submit" disabled={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
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
  const t = useTranslations("rbac");
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
          <Plus className="size-4" />
          {t("permissionsTable.createPermission")}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Key} title={t("permissionsTable.emptyTitle")} description={t("permissionsTable.emptyDescription")}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t("permissionsTable.createPermission")}
          </Button>
        </EmptyState>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">{t("permissionsTable.colId")}</TableHead>
                    <TableHead>{t("permissionsTable.colKey")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("permissionsTable.colDescription")}</TableHead>
                    <TableHead>{t("permissionsTable.colStatus")}</TableHead>
                    <TableHead className="w-[100px]">{t("permissionsTable.colActions")}</TableHead>
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
                        <Badge variant={perm.active !== false ? "soft-success" : "outline"} className="text-xs">
                          {perm.active !== false ? t("permissionsTable.statusActive") : t("permissionsTable.statusInactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditItem(perm)} title={t("permissionsTable.actionEdit")}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setDeleteItem(perm)} title={t("permissionsTable.actionDelete")}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden" aria-label={t("permissionsTable.mobileListLabel")}>
            {items.map((perm) => (
              <li key={perm.permission_id}>
                <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Key className="size-5 text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <code className="block truncate rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                        {perm.permission_name}
                      </code>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        #{perm.permission_id}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setEditItem(perm)}
                      aria-label={t("permissionsTable.editAriaLabel", { name: perm.permission_name })}
                    >
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant={perm.active !== false ? "soft-success" : "outline"} className="text-xs">
                      {perm.active !== false ? t("permissionsTable.statusActive") : t("permissionsTable.statusInactive")}
                    </Badge>
                  </div>

                  {perm.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {perm.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setEditItem(perm)}
                      aria-label={t("permissionsTable.editAriaLabel", { name: perm.permission_name })}
                    >
                      <Pencil className="size-3" aria-hidden="true" />
                      {t("permissionsTable.actionEdit")}
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteItem(perm)}
                      aria-label={t("permissionsTable.deleteAriaLabel", { name: perm.permission_name })}
                    >
                      <Trash2 className="size-3" aria-hidden="true" />
                      {t("permissionsTable.actionDelete")}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("permissionsTable.createDialogTitle")}</DialogTitle>
            <DialogDescription>{t("permissionsTable.createDialogDesc")}</DialogDescription>
          </DialogHeader>
          <form action={createFormAction} className="space-y-4">
            {createState.error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{createState.error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="create_permission_name">{t("permissionsTable.fieldPermissionKey")} <span className="text-destructive">*</span></Label>
              <Input id="create_permission_name" name="permission_name" placeholder={t("permissionsTable.fieldPermissionKeyPlaceholder")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_description">{t("permissionsTable.fieldDescription")}</Label>
              <Input id="create_description" name="description" placeholder={t("permissionsTable.fieldDescriptionPlaceholder")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("permissionsTable.cancel")}</Button>
              <SubmitButton label={t("permissionsTable.create")} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editItem && (
        <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("permissionsTable.editDialogTitle")}</DialogTitle>
            </DialogHeader>
            <form action={updateFormAction} className="space-y-4">
              {updateState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{updateState.error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit_permission_name">{t("permissionsTable.fieldPermissionKey")} <span className="text-destructive">*</span></Label>
                <Input id="edit_permission_name" name="permission_name" defaultValue={editItem.permission_name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">{t("permissionsTable.fieldDescription")}</Label>
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
                <Label htmlFor="edit_active">{t("permissionsTable.fieldActive")}</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>{t("permissionsTable.cancel")}</Button>
                <SubmitButton label={t("permissionsTable.saveChanges")} />
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
              <AlertDialogTitle>{t("permissionsTable.deleteDialogTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("permissionsTable.deleteDialogDescPre")}{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{deleteItem.permission_name}</code>
                {t("permissionsTable.deleteDialogDescPost")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("permissionsTable.cancel")}</AlertDialogCancel>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={deleteItem.permission_id} />
                <DeleteButton label={t("permissionsTable.delete")} />
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
