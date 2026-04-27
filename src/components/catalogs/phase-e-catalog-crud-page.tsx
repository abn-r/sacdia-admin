"use client";

/**
 * PhaseECatalogCrudPage
 *
 * Reusable CRUD page for Phase E i18n catalog targets.
 * Mirrors HonorCategoriesCrudPage pattern exactly:
 * - Dialog for create/edit with TranslationsTabsField
 * - AlertDialog for delete confirmation
 * - useActionState for server actions
 */

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { TranslationsTabsField } from "@/components/forms/translations-tabs-field";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { PhaseEActionState } from "@/lib/phase-e-catalogs/actions";
import { useFormStatus } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;
type FormAction = (prev: PhaseEActionState, data: FormData) => Promise<PhaseEActionState>;

export interface PhaseECatalogCrudPageProps {
  /** Page title shown in PageHeader */
  title: string;
  /** Page description shown in PageHeader */
  description?: string;
  /** Noun used in dialog headers and button labels (singular) */
  entityLabel: string;
  /** Icon shown in EmptyState */
  emptyIcon: LucideIcon;
  /** Whether this catalog includes a description field */
  includeDescription?: boolean;
  /** Primary key field name on each record */
  idField: string;
  /** Display name field */
  nameField: string;
  /** Records fetched server-side */
  items: AnyRecord[];
  /** Pagination metadata */
  meta: { page: number; limit: number; total: number; totalPages: number };
  /** RBAC flags */
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** Server actions */
  createAction: FormAction;
  updateAction: FormAction;
  deleteAction: FormAction;
}

// ─── SubmitButton ─────────────────────────────────────────────────────────────

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
    <Button
      type="submit"
      disabled={pending}
      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
    >
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      Eliminar
    </Button>
  );
}

// ─── Form fields ──────────────────────────────────────────────────────────────

interface FormFieldsProps {
  idPrefix: string;
  item?: AnyRecord | null;
  includeDescription: boolean;
  activeChecked: boolean;
  onActiveChange: (v: boolean) => void;
  translations: CatalogTranslation[];
  onTranslationsChange: (t: CatalogTranslation[]) => void;
  entityLabel: string;
}

function CatalogFormFields({
  idPrefix,
  item,
  includeDescription,
  activeChecked,
  onActiveChange,
  translations,
  onTranslationsChange,
  entityLabel,
}: FormFieldsProps) {
  const nameVal = typeof item?.name === "string" ? item.name : "";
  const descVal = typeof item?.description === "string" ? item.description : "";

  const esContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>
          Nombre <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          defaultValue={nameVal}
          required
          placeholder={`Nombre de ${entityLabel.toLowerCase()}`}
        />
      </div>

      {includeDescription && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-description`}>Descripción</Label>
          <Textarea
            id={`${idPrefix}-description`}
            name="description"
            rows={3}
            defaultValue={descVal}
            placeholder="Descripción opcional"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input type="hidden" name="active" value={activeChecked ? "on" : ""} />
        <Checkbox
          id={`${idPrefix}-active`}
          checked={activeChecked}
          onCheckedChange={(checked) => onActiveChange(!!checked)}
        />
        <Label htmlFor={`${idPrefix}-active`}>Activo</Label>
      </div>
    </div>
  );

  return (
    <TranslationsTabsField
      esContent={esContent}
      translations={translations}
      onTranslationsChange={onTranslationsChange}
      includeDescription={includeDescription}
      fieldNamePrefix="translations"
    />
  );
}

// ─── PhaseECatalogCrudPage ────────────────────────────────────────────────────

type NavigationMode = "push" | "replace";

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function toPositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function PhaseECatalogCrudPage({
  title,
  description,
  entityLabel,
  emptyIcon: EmptyIcon,
  includeDescription = true,
  idField,
  nameField,
  items,
  meta,
  canCreate,
  canEdit,
  canDelete,
  createAction,
  updateAction,
  deleteAction,
}: PhaseECatalogCrudPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<AnyRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<AnyRecord | null>(null);

  const [createActiveChecked, setCreateActiveChecked] = useState(true);
  const [editActiveChecked, setEditActiveChecked] = useState(true);
  const [createTranslations, setCreateTranslations] = useState<CatalogTranslation[]>([]);
  const [editTranslations, setEditTranslations] = useState<CatalogTranslation[]>([]);

  const [createState, createFormAction] = useActionState<PhaseEActionState, FormData>(createAction, {});
  const [updateState, updateFormAction] = useActionState<PhaseEActionState, FormData>(updateAction, {});
  const [deleteState, deleteFormAction] = useActionState<PhaseEActionState, FormData>(deleteAction, {});

  const getItemId = (item: AnyRecord): number | null => toPositiveInt(item[idField]);
  const getItemName = (item: AnyRecord): string =>
    toText(item[nameField]) ?? toText(item.name) ?? "—";

  useEffect(() => {
    latestParamsRef.current = searchParamsString;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [searchParamsString]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateParam = useCallback(
    (key: string, value: string, mode: NavigationMode = "push") => {
      if (key !== "search" && debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const params = new URLSearchParams(latestParamsRef.current);
      const normalized = value.trim();
      if (!normalized || normalized === "all") {
        params.delete(key);
      } else {
        params.set(key, normalized);
      }
      if (key === "search") {
        params.delete("name");
        params.delete("q");
      }
      params.set("page", "1");
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      if (mode === "replace") {
        router.replace(nextUrl);
      } else {
        router.push(nextUrl);
      }
    },
    [pathname, router],
  );

  const currentSearch =
    searchParams.get("search") ?? searchParams.get("name") ?? searchParams.get("q") ?? "";
  const currentStatusFilter = searchParams.get("active") ?? "all";
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const handleSearchInputChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParam("search", value, "replace");
      }, 400);
    },
    [updateParam],
  );

  const hasActiveFilters = Boolean(currentSearch || currentStatusFilter !== "all");
  const canMutate = canCreate || canEdit || canDelete;
  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);
  const idPrefix = "phaseE";

  function handleCreateOpen(open: boolean) {
    setCreateOpen(open);
    if (open) {
      setCreateActiveChecked(true);
      setCreateTranslations([]);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description}>
        {canCreate && (
          <Button onClick={() => handleCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Crear {entityLabel.toLowerCase()}
          </Button>
        )}
      </PageHeader>

      <div className="space-y-4">
        {/* Filter bar */}
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">Filtros</h3>
            <span className="text-xs text-muted-foreground">Refina el listado por campo</span>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-end gap-4">
              <div className="w-[300px] space-y-1">
                <Label htmlFor={`${idPrefix}-filter-search`}>Nombre</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={`${idPrefix}-filter-search`}
                    placeholder="Buscar por nombre..."
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    className="bg-background pl-9"
                  />
                </div>
              </div>
              <div className="w-[200px] space-y-1">
                <Label htmlFor={`${idPrefix}-filter-status`}>Estado</Label>
                <Select
                  value={currentStatusFilter}
                  onValueChange={(v) => updateParam("active", v)}
                >
                  <SelectTrigger id={`${idPrefix}-filter-status`} className="bg-background">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="true">Activos</SelectItem>
                    <SelectItem value="false">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Table / empty state */}
        {items.length === 0 ? (
          <EmptyState
            icon={EmptyIcon}
            title={hasActiveFilters ? "Sin resultados" : `No hay ${entityLabel.toLowerCase()}s`}
            description={
              hasActiveFilters
                ? `No hay ${entityLabel.toLowerCase()}s que coincidan con los filtros.`
                : "No se encontraron registros."
            }
          >
            {canCreate && !hasActiveFilters && (
              <Button onClick={() => handleCreateOpen(true)}>
                <Plus className="mr-2 size-4" />
                Crear {entityLabel.toLowerCase()}
              </Button>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    {includeDescription && <TableHead>Descripción</TableHead>}
                    <TableHead>Estado</TableHead>
                    {(canEdit || canDelete) && (
                      <TableHead className="sticky right-0 z-20 w-[100px] border-l bg-background">
                        Acciones
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const itemId = getItemId(item);
                    const itemName = getItemName(item);
                    const rowKey = itemId ? `row-${itemId}` : `row-idx-${(safePage - 1) * safeLimit + idx}`;

                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="font-medium">{itemName}</TableCell>
                        {includeDescription && (
                          <TableCell className="max-w-[380px] text-sm text-muted-foreground">
                            {toText(item.description) ?? "—"}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge
                            variant={item.active !== false ? "default" : "outline"}
                            className="text-xs"
                          >
                            {item.active !== false ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell className="sticky right-0 z-10 border-l bg-background">
                            <div className="hidden gap-1 md:flex">
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  disabled={!itemId}
                                  onClick={() => {
                                    setEditItem(item);
                                    setEditActiveChecked(item.active !== false);
                                    setEditTranslations(
                                      Array.isArray(item.translations)
                                        ? (item.translations as CatalogTranslation[])
                                        : [],
                                    );
                                  }}
                                  title="Editar"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:text-destructive"
                                  disabled={!itemId}
                                  onClick={() => setDeleteItem(item)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                            <div className="md:hidden">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8" title="Acciones">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canEdit && (
                                    <DropdownMenuItem
                                      disabled={!itemId}
                                      onSelect={() => {
                                        setEditItem(item);
                                        setEditActiveChecked(item.active !== false);
                                        setEditTranslations(
                                          Array.isArray(item.translations)
                                            ? (item.translations as CatalogTranslation[])
                                            : [],
                                        );
                                      }}
                                    >
                                      <Pencil className="size-4" />
                                      Editar
                                    </DropdownMenuItem>
                                  )}
                                  {canDelete && (
                                    <DropdownMenuItem
                                      disabled={!itemId}
                                      variant="destructive"
                                      onSelect={() => setDeleteItem(item)}
                                    >
                                      <Trash2 className="size-4" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        )}
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

      {/* Create dialog */}
      {canCreate && (
        <Dialog open={createOpen} onOpenChange={handleCreateOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear {entityLabel.toLowerCase()}</DialogTitle>
              <DialogDescription>
                Completa los campos para registrar {entityLabel.toLowerCase()}.
              </DialogDescription>
            </DialogHeader>
            <form action={createFormAction} className="space-y-4">
              {createState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createState.error}
                </div>
              )}
              <CatalogFormFields
                idPrefix={`${idPrefix}-create`}
                includeDescription={includeDescription}
                activeChecked={createActiveChecked}
                onActiveChange={setCreateActiveChecked}
                translations={createTranslations}
                onTranslationsChange={setCreateTranslations}
                entityLabel={entityLabel}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <SubmitButton label="Crear" />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit dialog */}
      {canEdit && editItem && (
        <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar {entityLabel.toLowerCase()}</DialogTitle>
            </DialogHeader>
            <form action={updateFormAction} className="space-y-4">
              <input type="hidden" name="id" value={String(getItemId(editItem) ?? "")} />
              {updateState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {updateState.error}
                </div>
              )}
              <CatalogFormFields
                idPrefix={`${idPrefix}-edit`}
                item={editItem}
                includeDescription={includeDescription}
                activeChecked={editActiveChecked}
                onActiveChange={setEditActiveChecked}
                translations={editTranslations}
                onTranslationsChange={setEditTranslations}
                entityLabel={entityLabel}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                  Cancelar
                </Button>
                <SubmitButton label="Guardar cambios" />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete dialog */}
      {canDelete && deleteItem && (
        <AlertDialog
          open={!!deleteItem}
          onOpenChange={(open) => { if (!open) setDeleteItem(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                ¿Eliminar {entityLabel.toLowerCase()}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará{" "}
                <span className="font-medium">&quot;{getItemName(deleteItem)}&quot;</span>.
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <form action={deleteFormAction} className="space-y-2">
                <input type="hidden" name="id" value={String(getItemId(deleteItem) ?? "")} />
                {deleteState.error && (
                  <p className="text-xs text-destructive">{deleteState.error}</p>
                )}
                <DeleteButton />
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {!canMutate && (
        <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
          No cuentas con permisos para modificar este catálogo.
        </div>
      )}
    </div>
  );
}
