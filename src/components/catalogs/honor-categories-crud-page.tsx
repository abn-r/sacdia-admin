"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  Award,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { HonorCategoryActionState } from "@/lib/honor-categories/actions";

type HonorCategoryRecord = Record<string, unknown>;
type NavigationMode = "push" | "replace";
type HonorCategoryFormAction = (
  prevState: HonorCategoryActionState,
  formData: FormData,
) => Promise<HonorCategoryActionState>;

interface HonorCategoriesCrudPageProps {
  items: HonorCategoryRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createAction: HonorCategoryFormAction;
  updateAction: HonorCategoryFormAction;
  deleteAction: HonorCategoryFormAction;
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickCategoryId(item: HonorCategoryRecord): number | null {
  return toPositiveNumber(item.honor_category_id ?? item.category_id ?? item.id);
}

function pickCategoryName(item: HonorCategoryRecord): string {
  return toText(item.name) ?? toText(item.title) ?? "—";
}

function pickCategoryDescription(item: HonorCategoryRecord): string {
  return toText(item.description) ?? "—";
}

function pickHonorCount(item: HonorCategoryRecord): number | null {
  return toPositiveNumber(item.honors_count ?? item.honorsCount ?? item.honors_total ?? item.honors);
}

function getDefaultCheckboxValue(item?: HonorCategoryRecord | null): boolean {
  if (!item) return true;
  return item.active !== false;
}

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
    <Button type="submit" disabled={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      Eliminar
    </Button>
  );
}

type HonorCategoryFormFieldsProps = {
  item?: HonorCategoryRecord | null;
  activeChecked: boolean;
  onActiveChange: (checked: boolean) => void;
};

function HonorCategoryFormFields({ item, activeChecked, onActiveChange }: HonorCategoryFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="honor-category-name">
          Nombre <span className="text-destructive">*</span>
        </Label>
        <Input id="honor-category-name" name="name" defaultValue={toText(item?.name) ?? ""} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="honor-category-description">Descripción</Label>
        <Textarea
          id="honor-category-description"
          name="description"
          rows={3}
          defaultValue={toText(item?.description) ?? ""}
          placeholder="Describe esta categoría"
        />
      </div>

      <div className="flex items-center gap-2">
        <input type="hidden" name="active" value={activeChecked ? "on" : ""} />
        <Checkbox
          id="honor-category-active"
          checked={activeChecked}
          onCheckedChange={(checked) => onActiveChange(!!checked)}
        />
        <Label htmlFor="honor-category-active">Activa</Label>
      </div>
    </div>
  );
}

export function HonorCategoriesCrudPage({
  items,
  meta,
  canCreate,
  canEdit,
  canDelete,
  createAction,
  updateAction,
  deleteAction,
}: HonorCategoriesCrudPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<HonorCategoryRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<HonorCategoryRecord | null>(null);
  const [createActiveChecked, setCreateActiveChecked] = useState(true);
  const [editActiveChecked, setEditActiveChecked] = useState(true);

  const [createState, createFormAction] = useActionState<HonorCategoryActionState, FormData>(createAction, {});
  const [updateState, updateFormAction] = useActionState<HonorCategoryActionState, FormData>(updateAction, {});
  const [deleteState, deleteFormAction] = useActionState<HonorCategoryActionState, FormData>(deleteAction, {});

  const handleCreateDialogChange = (open: boolean) => {
    setCreateOpen(open);
    if (open) setCreateActiveChecked(true);
  };

  const handleEditDialogChange = (open: boolean) => {
    if (!open) setEditItem(null);
  };

  useEffect(() => {
    latestParamsRef.current = searchParamsString;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [searchParamsString]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  const updateParam = useCallback((key: string, value: string, mode: NavigationMode = "push") => {
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
    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

    if (mode === "replace") {
      router.replace(nextUrl);
      return;
    }

    router.push(nextUrl);
  }, [pathname, router]);

  const currentSearch =
    searchParams.get("search") ??
    searchParams.get("name") ??
    searchParams.get("q") ??
    "";
  const currentStatusFilter = searchParams.get("active") ?? "all";

  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      updateParam("search", value, "replace");
    }, 400);
  }, [updateParam]);

  const hasActiveFilters = Boolean(
    currentSearch ||
    currentStatusFilter !== "all",
  );

  const canMutate = canCreate || canEdit || canDelete;
  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);

  return (
    <div className="space-y-6">
      <PageHeader title="Categorías de especialidades" description="Catálogo de categorías para especialidades.">
        {canCreate && (
          <Button onClick={() => handleCreateDialogChange(true)}>
            <Plus className="mr-2 size-4" />
            Crear categoría
          </Button>
        )}
      </PageHeader>

      <div className="space-y-4">
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">Filtros</h3>
            <span className="text-xs text-muted-foreground">Refina el listado por campo</span>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-end gap-4">
              <div className="w-[300px] space-y-1">
                <Label htmlFor="honor-category-filter-name">Nombre</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="honor-category-filter-name"
                    placeholder="Buscar por nombre..."
                    value={searchInput}
                    onChange={(event) => handleSearchInputChange(event.target.value)}
                    className="bg-background pl-9"
                  />
                </div>
              </div>

              <div className="w-[200px] space-y-1">
                <Label htmlFor="honor-category-filter-status">Estado</Label>
                <Select value={currentStatusFilter} onValueChange={(value) => updateParam("active", value)}>
                  <SelectTrigger id="honor-category-filter-status" className="bg-background">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="true">Activas</SelectItem>
                    <SelectItem value="false">Inactivas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Award}
            title={hasActiveFilters ? "Sin resultados" : "No hay categorías de especialidades"}
            description={hasActiveFilters ? "No hay categorías que coincidan con los filtros." : "No se encontraron registros."}
          >
            {canCreate && !hasActiveFilters && (
              <Button onClick={() => handleCreateDialogChange(true)}>
                <Plus className="mr-2 size-4" />
                Crear categoría
              </Button>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Especialidades asociadas</TableHead>
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
                    const categoryId = pickCategoryId(item);
                    const categoryName = pickCategoryName(item);
                    const description = pickCategoryDescription(item);
                    const honorCount = pickHonorCount(item);
                    const rowKey = categoryId
                      ? `honor-category-${categoryId}`
                      : `honor-category-row-${(safePage - 1) * safeLimit + idx}`;

                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="font-medium">
                          {categoryId ? (
                            <Link
                              href={`/dashboard/catalogs/honor-categories/${categoryId}`}
                              className="text-primary hover:underline"
                            >
                              {categoryName}
                            </Link>
                          ) : categoryName}
                        </TableCell>
                        <TableCell className="max-w-[380px] text-sm text-muted-foreground">{description}</TableCell>
                        <TableCell className="text-sm">{honorCount ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={item.active !== false ? "default" : "outline"} className="text-xs">
                            {item.active !== false ? "Activa" : "Inactiva"}
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
                                  disabled={!categoryId}
                                  onClick={() => {
                                    setEditItem(item);
                                    setEditActiveChecked(getDefaultCheckboxValue(item));
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
                                  disabled={!categoryId}
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
                                      disabled={!categoryId}
                                      onSelect={() => {
                                        setEditItem(item);
                                        setEditActiveChecked(getDefaultCheckboxValue(item));
                                      }}
                                    >
                                      <Pencil className="size-4" />
                                      Editar
                                    </DropdownMenuItem>
                                  )}
                                  {canDelete && (
                                    <DropdownMenuItem
                                      disabled={!categoryId}
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

      {canCreate && (
        <Dialog open={createOpen} onOpenChange={handleCreateDialogChange}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Crear categoría</DialogTitle>
              <DialogDescription>
                Completa los campos necesarios para registrar la categoría.
              </DialogDescription>
            </DialogHeader>
            <form action={createFormAction} className="space-y-4">
              {createState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createState.error}
                </div>
              )}
              <HonorCategoryFormFields
                activeChecked={createActiveChecked}
                onActiveChange={setCreateActiveChecked}
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

      {canEdit && editItem && (
        <Dialog open={!!editItem} onOpenChange={handleEditDialogChange}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Editar categoría</DialogTitle>
            </DialogHeader>
            <form action={updateFormAction} className="space-y-4">
              <input type="hidden" name="id" value={String(pickCategoryId(editItem) ?? "")} />
              {updateState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {updateState.error}
                </div>
              )}
              <HonorCategoryFormFields
                item={editItem}
                activeChecked={editActiveChecked}
                onActiveChange={setEditActiveChecked}
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

      {canDelete && deleteItem && (
        <AlertDialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará la categoría
                {" "}
                <span className="font-medium">&quot;{pickCategoryName(deleteItem)}&quot;</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <form action={deleteFormAction} className="space-y-2">
                <input type="hidden" name="id" value={String(pickCategoryId(deleteItem) ?? "")} />
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
          No cuentas con permisos para modificar categorías de especialidades.
        </div>
      )}
    </div>
  );
}
