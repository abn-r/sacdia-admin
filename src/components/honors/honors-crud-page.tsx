"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { HonorImageCell } from "@/components/honors/honor-image-cell";
import type { HonorActionState } from "@/lib/honors/actions";

type HonorRecord = Record<string, unknown>;
type SelectOption = { label: string; value: number };
type NavigationMode = "push" | "replace";
type HonorFormAction = (prevState: HonorActionState, formData: FormData) => Promise<HonorActionState>;
type HonorUpdateAction = (
  honorId: number,
  prevState: HonorActionState,
  formData: FormData,
) => Promise<HonorActionState>;

const HONOR_IMAGE_KEYS = [
  "patch_image",
  "patchImage",
  "honor_image",
  "honorImage",
  "image_url",
  "imageUrl",
  "image",
  "image_path",
  "imagePath",
  "patch",
  "patch_url",
  "patchUrl",
  "photo",
  "photo_url",
  "photoUrl",
  "icon",
  "icon_url",
  "iconUrl",
] as const;

interface HonorsCrudPageProps {
  items: HonorRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  categoryOptions: SelectOption[];
  clubTypeOptions: SelectOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createAction: HonorFormAction;
  updateActionBase: HonorUpdateAction;
  deactivateAction: HonorFormAction;
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

function pickHonorId(item: HonorRecord): number | null {
  return toPositiveNumber(item.honor_id ?? item.id);
}

function pickHonorName(item: HonorRecord): string {
  return toText(item.name) ?? toText(item.title) ?? "—";
}

function pickHonorImage(item: HonorRecord): string | null {
  for (const key of HONOR_IMAGE_KEYS) {
    const value = toText(item[key]);
    if (value) return value;
  }
  return null;
}

function resolveCategoryName(item: HonorRecord, categoryNameById: Map<number, string>): string {
  const directNameKeys = [
    "category",
    "category_name",
    "honors_category_name",
    "honor_category_name",
  ] as const;

  for (const key of directNameKeys) {
    const value = item[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (value && typeof value === "object") {
      const nestedName = toText((value as HonorRecord).name);
      if (nestedName) return nestedName;
    }
  }

  const idCandidates = [item.honors_category_id, item.honor_category_id, item.category_id];
  for (const candidate of idCandidates) {
    const id = toPositiveNumber(candidate);
    if (!id) continue;
    const name = categoryNameById.get(id);
    if (name) return name;
  }

  return "—";
}

function resolveClubTypeName(item: HonorRecord, clubTypeById: Map<number, string>): string {
  const nestedName = item.club_type && typeof item.club_type === "object"
    ? toText((item.club_type as HonorRecord).name)
    : null;
  if (nestedName) return nestedName;

  const direct = toText(item.club_type_name);
  if (direct) return direct;

  const id = toPositiveNumber(item.club_type_id);
  if (!id) return "—";
  return clubTypeById.get(id) ?? `#${id}`;
}

function getDefaultCheckboxValue(item?: HonorRecord | null): boolean {
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

type HonorFormFieldsProps = {
  item?: HonorRecord | null;
  categoryOptions: SelectOption[];
  clubTypeOptions: SelectOption[];
  activeChecked: boolean;
  onActiveChange: (checked: boolean) => void;
};

function HonorFormFields({
  item,
  categoryOptions,
  clubTypeOptions,
  activeChecked,
  onActiveChange,
}: HonorFormFieldsProps) {
  const currentCategoryId = toPositiveNumber(item?.honors_category_id ?? item?.category_id);
  const currentClubTypeId = toPositiveNumber(item?.club_type_id);
  const currentSkillLevel = toPositiveNumber(item?.skill_level) ?? 1;
  const currentMasterHonor = toPositiveNumber(item?.master_honors);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="honor_name">
          Nombre <span className="text-destructive">*</span>
        </Label>
        <Input id="honor_name" name="name" defaultValue={toText(item?.name) ?? ""} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="honor_description">Descripción</Label>
        <Textarea
          id="honor_description"
          name="description"
          rows={3}
          defaultValue={toText(item?.description) ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="honor_image">Imagen (URL o archivo)</Label>
        <Input
          id="honor_image"
          name="honor_image"
          defaultValue={toText(item?.honor_image ?? item?.patch_image) ?? ""}
          placeholder="Especialidades/acolchado.png"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="material_url">Material (PDF)</Label>
        <Input
          id="material_url"
          name="material_url"
          defaultValue={toText(item?.material_url ?? item?.material_honor) ?? ""}
          placeholder="Especialidades/Material/acolchado.pdf"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select name="honors_category_id" defaultValue={currentCategoryId ? String(currentCategoryId) : undefined}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tipo de club</Label>
          <Select name="club_type_id" defaultValue={currentClubTypeId ? String(currentClubTypeId) : undefined}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar club" />
            </SelectTrigger>
            <SelectContent>
              {clubTypeOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="skill_level">Nivel</Label>
          <Input
            id="skill_level"
            name="skill_level"
            type="number"
            min={1}
            defaultValue={String(currentSkillLevel)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="master_honors">Master honor</Label>
          <Input
            id="master_honors"
            name="master_honors"
            type="number"
            min={1}
            defaultValue={currentMasterHonor ? String(currentMasterHonor) : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">Año</Label>
          <Input id="year" name="year" defaultValue={toText(item?.year) ?? ""} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="hidden" name="active" value={activeChecked ? "on" : ""} />
        <Checkbox
          id="active"
          checked={activeChecked}
          onCheckedChange={(checked) => onActiveChange(!!checked)}
        />
        <Label htmlFor="active">Activo</Label>
      </div>
    </div>
  );
}

export function HonorsCrudPage({
  items,
  meta,
  categoryOptions,
  clubTypeOptions,
  canCreate,
  canEdit,
  canDelete,
  createAction,
  updateActionBase,
  deactivateAction,
}: HonorsCrudPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<HonorRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<HonorRecord | null>(null);
  const [createActiveChecked, setCreateActiveChecked] = useState(true);
  const [editActiveChecked, setEditActiveChecked] = useState(true);

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const option of categoryOptions) {
      map.set(option.value, option.label);
    }
    return map;
  }, [categoryOptions]);

  const clubTypeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const option of clubTypeOptions) {
      map.set(option.value, option.label);
    }
    return map;
  }, [clubTypeOptions]);

  const [createState, createFormAction] = useActionState<HonorActionState, FormData>(createAction, {});
  const [deleteState, deleteFormAction] = useActionState<HonorActionState, FormData>(deactivateAction, {});

  const editId = editItem ? pickHonorId(editItem) : null;
  const boundUpdateAction = editItem && editId
    ? updateActionBase.bind(null, editId)
    : async (): Promise<HonorActionState> => ({ error: "No se pudo identificar la especialidad." });
  const [updateState, updateFormAction] = useActionState<HonorActionState, FormData>(boundUpdateAction, {});

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

    if (key === "categoryId") {
      params.delete("honors_category_id");
    }
    if (key === "clubTypeId") {
      params.delete("club_type_id");
    }
    if (key === "skillLevel") {
      params.delete("skill_level");
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
  const currentCategoryFilter =
    searchParams.get("categoryId") ??
    searchParams.get("honors_category_id") ??
    "all";
  const currentClubTypeFilter =
    searchParams.get("clubTypeId") ??
    searchParams.get("club_type_id") ??
    "all";
  const currentLevelFilter =
    searchParams.get("skillLevel") ??
    searchParams.get("skill_level") ??
    "all";
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

  const canMutate = canCreate || canEdit;

  const levelFilterOptions = useMemo(() => {
    const levels = Array.from(
      new Set(
        items
          .map((item) => toPositiveNumber(item.skill_level))
          .filter((value): value is number => value !== null),
      ),
    );
    const selectedLevel = toPositiveNumber(currentLevelFilter);
    if (selectedLevel && !levels.includes(selectedLevel)) {
      levels.push(selectedLevel);
    }
    return levels.sort((a, b) => a - b);
  }, [items, currentLevelFilter]);

  const hasActiveFilters = Boolean(
    currentSearch ||
    currentCategoryFilter !== "all" ||
    currentClubTypeFilter !== "all" ||
    currentLevelFilter !== "all" ||
    currentStatusFilter !== "all",
  );

  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);

  return (
    <div className="space-y-6">
      <PageHeader title="Especialidades" description="Catálogo de especialidades.">
        {canCreate && (
          <Button onClick={() => handleCreateDialogChange(true)}>
            <Plus className="mr-2 size-4" />
            Crear especialidad
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
              <div className="w-[280px] space-y-1">
                <Label htmlFor="honors-filter-name">Nombre</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="honors-filter-name"
                    placeholder="Buscar por nombre..."
                    value={searchInput}
                    onChange={(event) => handleSearchInputChange(event.target.value)}
                    className="bg-background pl-9"
                  />
                </div>
              </div>

              <div className="w-[210px] space-y-1">
                <Label htmlFor="honors-filter-category">Categoría</Label>
                <Select value={currentCategoryFilter} onValueChange={(value) => updateParam("categoryId", value)}>
                  <SelectTrigger id="honors-filter-category" className="bg-background">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[210px] space-y-1">
                <Label htmlFor="honors-filter-club-type">Tipo de club</Label>
                <Select value={currentClubTypeFilter} onValueChange={(value) => updateParam("clubTypeId", value)}>
                  <SelectTrigger id="honors-filter-club-type" className="bg-background">
                    <SelectValue placeholder="Tipo de club" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {clubTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[170px] space-y-1">
                <Label htmlFor="honors-filter-level">Nivel</Label>
                <Select value={currentLevelFilter} onValueChange={(value) => updateParam("skillLevel", value)}>
                  <SelectTrigger id="honors-filter-level" className="bg-background">
                    <SelectValue placeholder="Nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los niveles</SelectItem>
                    {levelFilterOptions.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        Nivel {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[170px] space-y-1">
                <Label htmlFor="honors-filter-status">Estado</Label>
                <Select value={currentStatusFilter} onValueChange={(value) => updateParam("active", value)}>
                  <SelectTrigger id="honors-filter-status" className="bg-background">
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

        {items.length === 0 ? (
          <EmptyState
            icon={Award}
            title={hasActiveFilters ? "Sin resultados" : "No hay especialidades"}
            description={hasActiveFilters ? "No hay especialidades que coincidan con los filtros." : "No se encontraron registros."}
          >
            {canCreate && !hasActiveFilters && (
              <Button onClick={() => handleCreateDialogChange(true)}>
                <Plus className="mr-2 size-4" />
                Crear especialidad
              </Button>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Especialidad</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Tipo de club</TableHead>
                    <TableHead>Nivel</TableHead>
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
                    const honorId = pickHonorId(item);
                    const honorName = pickHonorName(item);
                    const honorImage = pickHonorImage(item);
                    const categoryName = resolveCategoryName(item, categoryNameById);
                    const clubTypeName = resolveClubTypeName(item, clubTypeById);
                    const skillLevel = toPositiveNumber(item.skill_level);
                    const rowKey = honorId ? `honor-${honorId}` : `honor-row-${(safePage - 1) * safeLimit + idx}`;

                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="text-sm">
                          <HonorImageCell
                            name={honorName}
                            rawImage={honorImage}
                            nameHref={honorId ? `/dashboard/honors/${honorId}` : undefined}
                          />
                        </TableCell>
                        <TableCell className="text-sm">{categoryName}</TableCell>
                        <TableCell className="text-sm">{clubTypeName}</TableCell>
                        <TableCell className="text-sm">{skillLevel ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={item.active !== false ? "default" : "outline"} className="text-xs">
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
                                  disabled={!honorId}
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
                                  disabled={!honorId}
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
                                      disabled={!honorId}
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
                                      disabled={!honorId}
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear especialidad</DialogTitle>
              <DialogDescription>Completa los campos necesarios para registrar la especialidad.</DialogDescription>
            </DialogHeader>
            <form action={createFormAction} className="space-y-4">
              {createState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createState.error}
                </div>
              )}
              <HonorFormFields
                categoryOptions={categoryOptions}
                clubTypeOptions={clubTypeOptions}
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

      {canEdit && editItem && editId && (
        <Dialog open={!!editItem} onOpenChange={handleEditDialogChange}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar especialidad</DialogTitle>
            </DialogHeader>
            <form action={updateFormAction} className="space-y-4">
              {updateState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {updateState.error}
                </div>
              )}
              <HonorFormFields
                item={editItem}
                categoryOptions={categoryOptions}
                clubTypeOptions={clubTypeOptions}
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
              <AlertDialogTitle>¿Eliminar especialidad?</AlertDialogTitle>
              <AlertDialogDescription>
                Se desactivará de forma lógica la especialidad{" "}
                <span className="font-medium">&quot;{pickHonorName(deleteItem)}&quot;</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <form action={deleteFormAction} className="space-y-2">
                <input type="hidden" name="id" value={String(pickHonorId(deleteItem) ?? "")} />
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
          No cuentas con permisos para modificar especialidades.
        </div>
      )}
    </div>
  );
}
