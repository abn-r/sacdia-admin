"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Pencil,
  Plus,
  Trash2,
  Trophy,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { CategoryFormDialog } from "@/app/(dashboard)/dashboard/configuration/achievements/_components/category-form-dialog";
import type { AchievementActionState } from "@/lib/achievements/actions";

type CategoryRecord = Record<string, unknown>;

type FormAction = (
  prevState: AchievementActionState,
  formData: FormData,
) => Promise<AchievementActionState>;

interface Props {
  items: CategoryRecord[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  createAction: FormAction;
  updateAction: FormAction;
  deleteAction: FormAction;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function pickId(item: CategoryRecord): number | null {
  return toPositiveNumber(item.achievement_category_id ?? item.category_id ?? item.id);
}

function pickName(item: CategoryRecord): string {
  return toText(item.name) ?? toText(item.title) ?? "—";
}

function DeleteButton({ label }: { label: string }) {
  return <FormSubmitButton variant="destructive">{label}</FormSubmitButton>;
}

export function AchievementCategoriesCrudPage({
  items,
  meta,
  createAction,
  updateAction,
  deleteAction,
}: Props) {
  const t = useTranslations("achievements.crud.categories");
  const tToast = useTranslations("achievements.toasts");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<CategoryRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<CategoryRecord | null>(null);

  // Each wrapper runs the server action, then gives feedback and closes the dialog on success.
  const [createState, createFormAction] = useActionState<AchievementActionState, FormData>(
    async (prev, formData) => {
      const result = await createAction(prev, formData);
      if (result.ok) {
        toast.success(tToast("categoryCreated"));
        setCreateOpen(false);
      }
      return result;
    },
    {},
  );
  const [updateState, updateFormAction] = useActionState<AchievementActionState, FormData>(
    async (prev, formData) => {
      const result = await updateAction(prev, formData);
      if (result.ok) {
        toast.success(tToast("categoryUpdated"));
        setEditItem(null);
      }
      return result;
    },
    {},
  );
  const [deleteState, deleteFormAction] = useActionState<AchievementActionState, FormData>(
    async (prev, formData) => {
      const result = await deleteAction(prev, formData);
      if (result.ok) {
        toast.success(tToast("categoryDeactivated"));
        setDeleteItem(null);
      }
      return result;
    },
    {},
  );

  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          {t("newButton")}
        </Button>
      </PageHeader>

      <div className="space-y-4">
        {/* Table / Empty */}
        {items.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title={t("emptyNoFiltersTitle")}
            description={t("emptyNoFiltersDescription")}
          >
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t("newButton")}
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-transparent bg-card shadow-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("tableColName")}</TableHead>
                    <TableHead>{t("tableColDescription")}</TableHead>
                    <TableHead>{t("tableColIcon")}</TableHead>
                    <TableHead>{t("tableColOrder")}</TableHead>
                    <TableHead>{t("tableColStatus")}</TableHead>
                    <RowActionsHead className="sticky right-0 z-20 border-l bg-card" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const categoryId = pickId(item);
                    const categoryName = pickName(item);
                    const rowKey = categoryId
                      ? `achievement-cat-${categoryId}`
                      : `achievement-cat-row-${(safePage - 1) * safeLimit + idx}`;

                    return (
                      <TableRow key={rowKey} className="transition-colors hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {categoryId ? (
                            <Link
                              href={`/dashboard/configuration/achievements/${categoryId}`}
                              className="flex items-center gap-1.5 text-primary hover:underline"
                              prefetch={false}
                            >
                              {categoryName}
                              <ChevronRight className="size-3.5 text-muted-foreground" />
                            </Link>
                          ) : (
                            categoryName
                          )}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                          {toText(item.description) ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {toText(item.icon) ?? "—"}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {item.display_order != null ? String(item.display_order) : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge intent={flagStatusIntent(item.active !== false)} label={item.active !== false ? t("statusActive") : t("statusInactive")} size="sm" />
                        </TableCell>
                        <TableCell className="sticky right-0 z-10 border-l bg-card">
                          <RowActions
                            label={categoryName}
                            actions={[
                              {
                                label: t("actionEdit"),
                                icon: Pencil,
                                onSelect: () => setEditItem(item),
                                disabled: !categoryId,
                              },
                              {
                                label: `${t("actionDelete")}…`,
                                icon: Trash2,
                                destructive: true,
                                onSelect: () => setDeleteItem(item),
                                disabled: !categoryId,
                              },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <DataTablePagination
              page={safePage}
              totalPages={safeTotalPages}
              total={meta.total}
              limit={safeLimit}
              limitOptions={[10, 20, 50, 100]}
            />
          </>
        )}
      </div>

      {/* Create Dialog */}
      <CategoryFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        formAction={createFormAction}
        actionState={createState}
      />

      {/* Edit Dialog */}
      {editItem && (
        <CategoryFormDialog
          open={!!editItem}
          onOpenChange={(open) => { if (!open) setEditItem(null); }}
          mode="edit"
          item={editItem}
          formAction={updateFormAction}
          actionState={updateState}
        />
      )}

      {/* Delete AlertDialog */}
      {deleteItem && (
        <AlertDialog
          open={!!deleteItem}
          onOpenChange={(open) => { if (!open) setDeleteItem(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDescription", { name: pickName(deleteItem) })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("deleteCancelButton")}</AlertDialogCancel>
              <form action={deleteFormAction}>
                <input type="hidden" name="id" value={String(pickId(deleteItem) ?? "")} />
                {deleteState.error && (
                  <p className="mb-2 text-xs text-destructive">{deleteState.error}</p>
                )}
                <DeleteButton label={t("deleteConfirmButton")} />
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
