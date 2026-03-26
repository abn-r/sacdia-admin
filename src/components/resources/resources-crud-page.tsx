"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  FileText,
  Loader2,
  MoreHorizontal,
  Music,
  Pencil,
  Plus,
  Search,
  Trash2,
  Image,
  Video,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { ResourceActionState } from "@/lib/resources/resource-actions";
import type { ResourceType, ClubTypeTarget, ScopeLevel } from "@/lib/api/resources";

// ─── Constants ─────────────────────────────────────────────────────────────────

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  document: "Documento",
  audio: "Audio",
  image: "Imagen",
  video_link: "Video",
  text: "Texto",
};

const CLUB_TYPE_LABELS: Record<ClubTypeTarget, string> = {
  all: "Todos los clubes",
  Aventureros: "Aventureros",
  Conquistadores: "Conquistadores",
  "Guías Mayores": "Guías Mayores",
};

const SCOPE_LEVEL_LABELS: Record<ScopeLevel, string> = {
  system: "Sistema (global)",
  union: "Unión",
  local_field: "Campo local",
};

// ─── Types ──────────────────────────────────────────────────────────────────────

type ResourceRecord = Record<string, unknown>;
type CategoryRecord = { resource_category_id: number; name: string };
type NavigationMode = "push" | "replace";
type ResourceFormAction = (
  prevState: ResourceActionState,
  formData: FormData,
) => Promise<ResourceActionState>;

interface ResourcesCrudPageProps {
  items: ResourceRecord[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  categories: CategoryRecord[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createAction: ResourceFormAction;
  updateAction: ResourceFormAction;
  deleteAction: ResourceFormAction;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

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

function pickId(item: ResourceRecord): number | null {
  return toPositiveNumber(item.resource_id ?? item.id);
}

function pickTitle(item: ResourceRecord): string {
  return toText(item.title) ?? toText(item.name) ?? "—";
}

function pickResourceType(item: ResourceRecord): ResourceType | null {
  const type = item.resource_type;
  if (typeof type === "string" && type in RESOURCE_TYPE_LABELS) {
    return type as ResourceType;
  }
  return null;
}

function pickCategoryName(item: ResourceRecord): string {
  const cat = item.category;
  if (cat && typeof cat === "object") {
    const catRecord = cat as Record<string, unknown>;
    return toText(catRecord.name) ?? "—";
  }
  return "—";
}

function pickUploader(item: ResourceRecord): string {
  const uploader = item.uploader;
  if (uploader && typeof uploader === "object") {
    const u = uploader as Record<string, unknown>;
    return toText(u.name) ?? toText(u.email) ?? "—";
  }
  return "—";
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "—";
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "—";
  }
}

// ─── Badge helpers ──────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

function resourceTypeBadgeConfig(type: ResourceType | null): {
  label: string;
  variant: BadgeVariant;
  className: string;
  Icon: React.ElementType;
} {
  switch (type) {
    case "document":
      return { label: "Documento", variant: "default", className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300", Icon: FileText };
    case "audio":
      return { label: "Audio", variant: "secondary", className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300", Icon: Music };
    case "image":
      return { label: "Imagen", variant: "secondary", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300", Icon: Image };
    case "video_link":
      return { label: "Video", variant: "destructive", className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300", Icon: Video };
    case "text":
      return { label: "Texto", variant: "outline", className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800/30 dark:text-gray-300", Icon: BookOpen };
    default:
      return { label: "Desconocido", variant: "outline", className: "", Icon: FileText };
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

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

function ResourceTypeBadge({ type }: { type: ResourceType | null }) {
  const config = resourceTypeBadgeConfig(type);
  const Icon = config.Icon;
  return (
    <Badge variant={config.variant} className={`gap-1 text-xs ${config.className}`}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}

// ─── Create/Edit form ───────────────────────────────────────────────────────────

function ResourceFormFields({
  item,
  categories,
  isEdit,
}: {
  item?: ResourceRecord | null;
  categories: CategoryRecord[];
  isEdit?: boolean;
}) {
  const [resourceType, setResourceType] = useState<ResourceType>(
    (item?.resource_type as ResourceType) ?? "document",
  );
  const [scopeLevel, setScopeLevel] = useState<ScopeLevel>(
    (item?.scope_level as ScopeLevel) ?? "system",
  );

  const showFileUpload = !isEdit && ["document", "audio", "image"].includes(resourceType);
  const showExternalUrl = resourceType === "video_link";
  const showContent = resourceType === "text";
  const showScopeId = scopeLevel !== "system";

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="res-title">
          Título <span className="text-destructive">*</span>
        </Label>
        <Input
          id="res-title"
          name="title"
          defaultValue={toText(item?.title) ?? ""}
          required
          placeholder="Ej. Manual del Conquistador 2024"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="res-description">Descripción</Label>
        <Textarea
          id="res-description"
          name="description"
          rows={2}
          defaultValue={toText(item?.description) ?? ""}
          placeholder="Descripción breve del recurso"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Resource Type */}
        <div className="space-y-2">
          <Label htmlFor="res-type">
            Tipo de recurso <span className="text-destructive">*</span>
          </Label>
          <Select
            name="resource_type"
            value={resourceType}
            onValueChange={(v) => setResourceType(v as ResourceType)}
            disabled={isEdit}
            required
          >
            <SelectTrigger id="res-type">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(RESOURCE_TYPE_LABELS) as [ResourceType, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="res-category">Categoría</Label>
          <Select
            name="category_id"
            defaultValue={toPositiveNumber(item?.category_id)?.toString() ?? ""}
          >
            <SelectTrigger id="res-category">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin categoría</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.resource_category_id} value={String(cat.resource_category_id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Club Type */}
        <div className="space-y-2">
          <Label htmlFor="res-club-type">Tipo de club</Label>
          <Select
            name="club_type"
            defaultValue={(item?.club_type as string) ?? "all"}
          >
            <SelectTrigger id="res-club-type">
              <SelectValue placeholder="Todos los clubes" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(CLUB_TYPE_LABELS) as [ClubTypeTarget, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Scope Level */}
        <div className="space-y-2">
          <Label htmlFor="res-scope-level">Alcance</Label>
          <Select
            name="scope_level"
            value={scopeLevel}
            onValueChange={(v) => setScopeLevel(v as ScopeLevel)}
          >
            <SelectTrigger id="res-scope-level">
              <SelectValue placeholder="Alcance" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(SCOPE_LEVEL_LABELS) as [ScopeLevel, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scope ID — only when scope is union or local_field */}
      {showScopeId && (
        <div className="space-y-2">
          <Label htmlFor="res-scope-id">
            ID de {scopeLevel === "union" ? "unión" : "campo local"}
          </Label>
          <Input
            id="res-scope-id"
            name="scope_id"
            type="number"
            min={1}
            defaultValue={toPositiveNumber(item?.scope_id)?.toString() ?? ""}
            placeholder={`ID de la ${scopeLevel === "union" ? "unión" : "campo local"}`}
          />
          <p className="text-xs text-muted-foreground">
            Ingresa el ID numérico de la{" "}
            {scopeLevel === "union" ? "unión" : "campo local"} a la que pertenece el recurso.
          </p>
        </div>
      )}

      {/* File upload — only for create, not edit */}
      {showFileUpload && (
        <div className="space-y-2">
          <Label htmlFor="res-file">
            Archivo
            {resourceType !== "image" && <span className="ml-1 text-muted-foreground">(opcional)</span>}
          </Label>
          <Input
            id="res-file"
            name="file"
            type="file"
            accept={
              resourceType === "document"
                ? ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                : resourceType === "audio"
                  ? ".mp3,.wav,.ogg,.aac,.m4a"
                  : "image/*"
            }
            className="file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium"
          />
          <p className="text-xs text-muted-foreground">
            {resourceType === "document" && "PDF, Word, PowerPoint, Excel"}
            {resourceType === "audio" && "MP3, WAV, OGG, AAC, M4A"}
            {resourceType === "image" && "JPG, PNG, GIF, WebP, SVG"}
          </p>
        </div>
      )}

      {/* External URL — only for video_link */}
      {showExternalUrl && (
        <div className="space-y-2">
          <Label htmlFor="res-external-url">
            URL del video <span className="text-destructive">*</span>
          </Label>
          <Input
            id="res-external-url"
            name="external_url"
            type="url"
            defaultValue={toText(item?.external_url) ?? ""}
            required={showExternalUrl}
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
      )}

      {/* Content — only for text type */}
      {showContent && (
        <div className="space-y-2">
          <Label htmlFor="res-content">
            Contenido <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="res-content"
            name="content"
            rows={6}
            defaultValue={toText(item?.content) ?? ""}
            required={showContent}
            placeholder="Escribe el contenido del recurso aquí..."
          />
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export function ResourcesCrudPage({
  items,
  meta,
  categories,
  canCreate,
  canEdit,
  canDelete,
  createAction,
  updateAction,
  deleteAction,
}: ResourcesCrudPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ResourceRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<ResourceRecord | null>(null);

  const [createState, createFormAction] = useActionState<ResourceActionState, FormData>(createAction, {});
  const [updateState, updateFormAction] = useActionState<ResourceActionState, FormData>(updateAction, {});
  const [deleteState, deleteFormAction] = useActionState<ResourceActionState, FormData>(deleteAction, {});

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

  const updateParam = useCallback(
    (key: string, value: string, mode: NavigationMode = "push") => {
      if (key !== "search" && debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const params = new URLSearchParams(latestParamsRef.current);
      const normalized = value.trim();
      if (!normalized || normalized === "all" || normalized === "") {
        params.delete(key);
      } else {
        params.set(key, normalized);
      }
      params.set("page", "1");
      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      if (mode === "replace") { router.replace(nextUrl); return; }
      router.push(nextUrl);
    },
    [pathname, router],
  );

  const currentSearch = searchParams.get("search") ?? "";
  const currentTypeFilter = searchParams.get("resource_type") ?? "all";
  const currentCategoryFilter = searchParams.get("category_id") ?? "all";
  const currentClubTypeFilter = searchParams.get("club_type") ?? "all";
  const currentScopeFilter = searchParams.get("scope_level") ?? "all";

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

  const hasActiveFilters = Boolean(
    currentSearch ||
    currentTypeFilter !== "all" ||
    currentCategoryFilter !== "all" ||
    currentClubTypeFilter !== "all" ||
    currentScopeFilter !== "all",
  );

  const canMutate = canCreate || canEdit || canDelete;
  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recursos"
        description="Materiales, documentos, audios y videos para los clubes."
      >
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Subir recurso
          </Button>
        )}
      </PageHeader>

      <div className="space-y-4">
        {/* Filters */}
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">Filtros</h3>
            <span className="text-xs text-muted-foreground">Refina el listado</span>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max flex-wrap items-end gap-4">
              {/* Search */}
              <div className="w-[280px] space-y-1">
                <Label htmlFor="res-filter-search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="res-filter-search"
                    placeholder="Buscar por título..."
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    className="bg-background pl-9"
                  />
                </div>
              </div>

              {/* Type */}
              <div className="w-[180px] space-y-1">
                <Label htmlFor="res-filter-type">Tipo</Label>
                <Select
                  value={currentTypeFilter}
                  onValueChange={(v) => updateParam("resource_type", v)}
                >
                  <SelectTrigger id="res-filter-type" className="bg-background">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {(Object.entries(RESOURCE_TYPE_LABELS) as [ResourceType, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="w-[200px] space-y-1">
                <Label htmlFor="res-filter-category">Categoría</Label>
                <Select
                  value={currentCategoryFilter}
                  onValueChange={(v) => updateParam("category_id", v)}
                >
                  <SelectTrigger id="res-filter-category" className="bg-background">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.resource_category_id} value={String(cat.resource_category_id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Club Type */}
              <div className="w-[200px] space-y-1">
                <Label htmlFor="res-filter-club-type">Tipo de club</Label>
                <Select
                  value={currentClubTypeFilter}
                  onValueChange={(v) => updateParam("club_type", v)}
                >
                  <SelectTrigger id="res-filter-club-type" className="bg-background">
                    <SelectValue placeholder="Todos los clubes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los clubes</SelectItem>
                    {(Object.entries(CLUB_TYPE_LABELS) as [ClubTypeTarget, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scope */}
              <div className="w-[190px] space-y-1">
                <Label htmlFor="res-filter-scope">Alcance</Label>
                <Select
                  value={currentScopeFilter}
                  onValueChange={(v) => updateParam("scope_level", v)}
                >
                  <SelectTrigger id="res-filter-scope" className="bg-background">
                    <SelectValue placeholder="Todos los alcances" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los alcances</SelectItem>
                    {(Object.entries(SCOPE_LEVEL_LABELS) as [ScopeLevel, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Table or Empty */}
        {items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={hasActiveFilters ? "Sin resultados" : "No hay recursos"}
            description={
              hasActiveFilters
                ? "No hay recursos que coincidan con los filtros aplicados."
                : "Sube el primer recurso para los clubes."
            }
          >
            {canCreate && !hasActiveFilters && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 size-4" />
                Subir recurso
              </Button>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Alcance</TableHead>
                    <TableHead>Subido por</TableHead>
                    <TableHead>Fecha</TableHead>
                    {(canEdit || canDelete) && (
                      <TableHead className="sticky right-0 z-20 w-[100px] border-l bg-background">
                        Acciones
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const itemId = pickId(item);
                    const title = pickTitle(item);
                    const type = pickResourceType(item);
                    const categoryName = pickCategoryName(item);
                    const uploader = pickUploader(item);
                    const rowKey = itemId
                      ? `res-${itemId}`
                      : `res-row-${(safePage - 1) * safeLimit + idx}`;
                    const clubType = toText(item.club_type as string);
                    const scopeLevel = toText(item.scope_level as string);

                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="font-medium">{title}</TableCell>
                        <TableCell>
                          <ResourceTypeBadge type={type} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {categoryName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {clubType
                            ? CLUB_TYPE_LABELS[clubType as ClubTypeTarget] ?? clubType
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {scopeLevel
                            ? SCOPE_LEVEL_LABELS[scopeLevel as ScopeLevel] ?? scopeLevel
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{uploader}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(item.created_at)}
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
                                  onClick={() => setEditItem(item)}
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
                                      onSelect={() => setEditItem(item)}
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

      {/* Create Dialog */}
      {canCreate && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Subir recurso</DialogTitle>
              <DialogDescription>
                Completa los campos para registrar el nuevo recurso.
              </DialogDescription>
            </DialogHeader>
            <form action={createFormAction} encType="multipart/form-data" className="space-y-4">
              {createState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createState.error}
                </div>
              )}
              <ResourceFormFields categories={categories} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <SubmitButton label="Subir recurso" />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {canEdit && editItem && (
        <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar recurso</DialogTitle>
              <DialogDescription>
                Solo se puede editar la metadata. Para cambiar el archivo, elimina y vuelve a crear el recurso.
              </DialogDescription>
            </DialogHeader>
            <form action={updateFormAction} className="space-y-4">
              <input type="hidden" name="id" value={String(pickId(editItem) ?? "")} />
              {updateState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {updateState.error}
                </div>
              )}
              <ResourceFormFields item={editItem} categories={categories} isEdit />
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

      {/* Delete Alert */}
      {canDelete && deleteItem && (
        <AlertDialog
          open={!!deleteItem}
          onOpenChange={(open) => { if (!open) setDeleteItem(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar recurso?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará el recurso{" "}
                <span className="font-medium">&quot;{pickTitle(deleteItem)}&quot;</span>. Esta
                acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <form action={deleteFormAction}>
                <input type="hidden" name="id" value={String(pickId(deleteItem) ?? "")} />
                {deleteState.error && (
                  <p className="mb-2 text-xs text-destructive">{deleteState.error}</p>
                )}
                <DeleteButton />
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {!canMutate && (
        <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
          No cuentas con permisos para modificar recursos.
        </div>
      )}
    </div>
  );
}
