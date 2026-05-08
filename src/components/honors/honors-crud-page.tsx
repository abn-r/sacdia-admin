"use client";

import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      Eliminar
    </Button>
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
  deactivateAction,
}: HonorsCrudPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const [deleteItem, setDeleteItem] = useState<HonorRecord | null>(null);

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

  const [deleteState, deleteFormAction] = useActionState<HonorActionState, FormData>(deactivateAction, {});

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
          <Button asChild>
            <Link href="/dashboard/honors/new">
              <Plus className="mr-2 size-4" />
              Crear especialidad
            </Link>
          </Button>
        )}
      </PageHeader>

      <div className="space-y-4">
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">Filtros</h3>
            <span className="text-xs text-muted-foreground">Refina el listado por campo</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <div className="space-y-1">
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

              <div className="space-y-1">
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

              <div className="space-y-1">
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

              <div className="space-y-1">
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

              <div className="space-y-1">
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

        {items.length === 0 ? (
          <EmptyState
            icon={Award}
            title={hasActiveFilters ? "Sin resultados" : "No hay especialidades"}
            description={hasActiveFilters ? "No hay especialidades que coincidan con los filtros." : "No se encontraron registros."}
          >
            {canCreate && !hasActiveFilters && (
              <Button asChild>
                <Link href="/dashboard/honors/new">
                  <Plus className="mr-2 size-4" />
                  Crear especialidad
                </Link>
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
                    const editHref = honorId ? `/dashboard/honors/${honorId}/edit` : null;

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
                          <Badge variant={item.active !== false ? "soft-success" : "outline"} className="text-xs">
                            {item.active !== false ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell className="sticky right-0 z-10 border-l bg-background">
                            <div className="hidden gap-1 md:flex">
                              {canEdit && editHref && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  asChild
                                  title="Editar"
                                >
                                  <Link href={editHref} aria-label={`Editar ${honorName}`}>
                                    <Pencil className="size-3.5" />
                                  </Link>
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
                                  {canEdit && editHref && (
                                    <DropdownMenuItem asChild>
                                      <Link href={editHref}>
                                        <Pencil className="size-4" />
                                        Editar
                                      </Link>
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
