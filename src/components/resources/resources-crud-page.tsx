"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  Download,
  ExternalLink,
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
  Globe,
  MapPin,
  Building,
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
  DropdownMenuSeparator,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import type { ResourceActionState } from "@/lib/resources/resource-actions";
import type { ResourceType, ClubTypeTarget, ScopeLevel } from "@/lib/api/resources";
import { apiRequestFromClient } from "@/lib/api/client";
import type { Union, LocalField } from "@/lib/api/geography";

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
  system: "Sistema",
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
  unions: Union[];
  localFields: LocalField[];
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
    const name = toText(u.name);
    const lastName = toText(u.last_name);
    if (name && lastName) return `${name} ${lastName}`;
    return name ?? toText(u.email) ?? "—";
  }
  return "—";
}

function pickScopeLevel(item: ResourceRecord): ScopeLevel | null {
  const level = item.scope_level;
  if (typeof level === "string" && level in SCOPE_LEVEL_LABELS) {
    return level as ScopeLevel;
  }
  return null;
}

function pickScopeId(item: ResourceRecord): number | null {
  return toPositiveNumber(item.scope_id);
}

function pickClubType(item: ResourceRecord): ClubTypeTarget | null {
  const ct = item.club_type;
  if (typeof ct === "string" && ct in CLUB_TYPE_LABELS) {
    return ct as ClubTypeTarget;
  }
  return null;
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "—";
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "—";
  }
}

function formatFileSize(bytes: unknown): string {
  const size = toPositiveNumber(bytes);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Badge helpers ──────────────────────────────────────────────────────────────

// Resource type badges use Ember chart tokens (chart-2..5 + destructive) for
// distinctive per-type identification while staying within the design system.
// Pattern matches pipeline-history-dialog.tsx: text + color-mix backgrounds.
function resourceTypeBadgeConfig(type: ResourceType | null): {
  label: string;
  className: string;
  Icon: React.ElementType;
} {
  switch (type) {
    case "document":
      return {
        label: "Documento",
        className:
          "border-[color-mix(in_oklch,var(--chart-2)_35%,transparent)] bg-[color-mix(in_oklch,var(--chart-2)_15%,transparent)] text-[var(--chart-2)]",
        Icon: FileText,
      };
    case "audio":
      return {
        label: "Audio",
        className:
          "border-[color-mix(in_oklch,var(--chart-5)_35%,transparent)] bg-[color-mix(in_oklch,var(--chart-5)_15%,transparent)] text-[var(--chart-5)]",
        Icon: Music,
      };
    case "image":
      return {
        label: "Imagen",
        className:
          "border-[color-mix(in_oklch,var(--chart-3)_35%,transparent)] bg-[color-mix(in_oklch,var(--chart-3)_15%,transparent)] text-[var(--chart-3)]",
        Icon: Image,
      };
    case "video_link":
      return {
        label: "Video",
        className: "border-destructive/35 bg-destructive/10 text-destructive",
        Icon: Video,
      };
    case "text":
      return {
        label: "Texto",
        className:
          "border-[color-mix(in_oklch,var(--chart-4)_35%,transparent)] bg-[color-mix(in_oklch,var(--chart-4)_15%,transparent)] text-[var(--chart-4)]",
        Icon: BookOpen,
      };
    default:
      return { label: "Desconocido", className: "", Icon: FileText };
  }
}

// Scope level badges use semantic neutrals (muted/secondary) because scope
// differentiation is conveyed by icon + label, not color. Avoids chromatic
// collision with resource-type badges in the same row.
function scopeLevelBadgeConfig(level: ScopeLevel | null): {
  label: string;
  className: string;
  Icon: React.ElementType;
} {
  switch (level) {
    case "system":
      return {
        label: "Sistema",
        className: "border-border bg-muted text-muted-foreground",
        Icon: Globe,
      };
    case "union":
      return {
        label: "Unión",
        className: "border-border bg-secondary text-secondary-foreground",
        Icon: Building,
      };
    case "local_field":
      return {
        label: "Campo",
        className: "border-border bg-muted/60 text-foreground",
        Icon: MapPin,
      };
    default:
      return { label: "—", className: "", Icon: Globe };
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function SubmitButton({ label, extraDisabled }: { label: string; extraDisabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || extraDisabled}>
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
      variant="destructive"
      disabled={pending}
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
    <Badge
      variant="outline"
      className={`gap-1 border text-xs font-medium ${config.className}`}
    >
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}

function ScopeBadge({
  level,
  scopeId,
  unions,
  localFields,
}: {
  level: ScopeLevel | null;
  scopeId: number | null;
  unions: Union[];
  localFields: LocalField[];
}) {
  const config = scopeLevelBadgeConfig(level);
  const Icon = config.Icon;

  let label = config.label;
  if (level === "union" && scopeId) {
    const union = unions.find((u) => u.union_id === scopeId);
    if (union) label = `Unión: ${union.name}`;
  } else if (level === "local_field" && scopeId) {
    const lf = localFields.find((lf) => lf.local_field_id === scopeId);
    if (lf) label = `Campo: ${lf.name}`;
  }

  if (!level) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge
      variant="outline"
      className={`gap-1 border text-xs font-medium ${config.className}`}
    >
      <Icon className="size-3 shrink-0" />
      <span className="truncate max-w-[140px]" title={label}>
        {label}
      </span>
    </Badge>
  );
}

// ─── Create/Edit form ───────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function ResourceFormFields({
  item,
  categories,
  unions,
  localFields,
  isEdit,
  onFileSizeError,
}: {
  item?: ResourceRecord | null;
  categories: CategoryRecord[];
  unions: Union[];
  localFields: LocalField[];
  isEdit?: boolean;
  onFileSizeError?: (error: string | null) => void;
}) {
  const [resourceType, setResourceType] = useState<ResourceType>(
    (item?.resource_type as ResourceType) ?? "document",
  );
  const [scopeLevel, setScopeLevel] = useState<ScopeLevel>(
    (item?.scope_level as ScopeLevel) ?? "system",
  );
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.size > MAX_FILE_SIZE) {
      const msg = `El archivo excede el límite de 50 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
      setFileSizeError(msg);
      onFileSizeError?.(msg);
      e.target.value = "";
    } else {
      setFileSizeError(null);
      onFileSizeError?.(null);
    }
  }

  const showFileUpload = !isEdit && ["document", "audio", "image"].includes(resourceType);
  const showExternalUrl = resourceType === "video_link";
  const showContent = resourceType === "text";
  const showScopeId = scopeLevel !== "system";

  const acceptedFileTypes: Record<string, string> = {
    document: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx",
    audio: ".mp3,.wav,.ogg,.aac,.m4a",
    image: "image/*",
  };

  const fileTypeDescriptions: Record<string, string> = {
    document: "PDF, Word, PowerPoint o Excel — máx. 50 MB",
    audio: "MP3, WAV, OGG, AAC, M4A — máx. 50 MB",
    image: "JPG, PNG, WebP, GIF — máx. 50 MB",
  };

  const currentScopeIdValue = toPositiveNumber(item?.scope_id)?.toString() ?? "";

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="res-title">
          Título <span className="ml-0.5 text-destructive">*</span>
        </Label>
        <Input
          id="res-title"
          name="title"
          defaultValue={toText(item?.title) ?? ""}
          required
          maxLength={255}
          placeholder="Ej. Manual del Conquistador 2025"
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
          placeholder="Descripción breve del recurso (opcional)"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Resource Type */}
        <div className="space-y-2">
          <Label htmlFor="res-type">
            Tipo de recurso <span className="ml-0.5 text-destructive">*</span>
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
              {(Object.entries(RESOURCE_TYPE_LABELS) as [ResourceType, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          {isEdit && (
            <p className="text-xs text-muted-foreground">
              El tipo no puede modificarse. Crea un nuevo recurso si necesitas cambiarlo.
            </p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="res-category">Categoría</Label>
          <Select
            name="category_id"
            defaultValue={toPositiveNumber(item?.category_id)?.toString() ?? "none"}
          >
            <SelectTrigger id="res-category">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría</SelectItem>
              {categories.map((cat) => (
                <SelectItem
                  key={cat.resource_category_id}
                  value={String(cat.resource_category_id)}
                >
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
              {(Object.entries(CLUB_TYPE_LABELS) as [ClubTypeTarget, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Scope Level */}
        <div className="space-y-2">
          <Label htmlFor="res-scope-level">
            Alcance <span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Select
            name="scope_level"
            value={scopeLevel}
            onValueChange={(v) => setScopeLevel(v as ScopeLevel)}
            disabled={isEdit}
          >
            <SelectTrigger id="res-scope-level">
              <SelectValue placeholder="Alcance" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(SCOPE_LEVEL_LABELS) as [ScopeLevel, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scope ID — union or local_field dropdown */}
      {showScopeId && (
        <div className="space-y-2">
          <Label htmlFor="res-scope-id">
            {scopeLevel === "union" ? "Unión" : "Campo local"}{" "}
            <span className="ml-0.5 text-destructive">*</span>
          </Label>
          {scopeLevel === "union" ? (
            unions.length > 0 ? (
              <Select
                name="scope_id"
                defaultValue={currentScopeIdValue || undefined}
                required
              >
                <SelectTrigger id="res-scope-id">
                  <SelectValue placeholder="Seleccionar unión" />
                </SelectTrigger>
                <SelectContent>
                  {unions.map((u) => (
                    <SelectItem key={u.union_id} value={String(u.union_id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="res-scope-id"
                name="scope_id"
                type="number"
                min={1}
                defaultValue={currentScopeIdValue}
                required
                placeholder="ID de la unión"
              />
            )
          ) : localFields.length > 0 ? (
            <Select
              name="scope_id"
              defaultValue={currentScopeIdValue || undefined}
              required
            >
              <SelectTrigger id="res-scope-id">
                <SelectValue placeholder="Seleccionar campo local" />
              </SelectTrigger>
              <SelectContent>
                {localFields.map((lf) => (
                  <SelectItem key={lf.local_field_id} value={String(lf.local_field_id)}>
                    {lf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="res-scope-id"
              name="scope_id"
              type="number"
              min={1}
              defaultValue={currentScopeIdValue}
              required
              placeholder="ID del campo local"
            />
          )}
        </div>
      )}

      {/* File upload — only for create */}
      {showFileUpload && (
        <div className="space-y-2">
          <Label htmlFor="res-file">Archivo</Label>
          <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 transition-colors hover:border-primary/40 hover:bg-muted/50">
            <input
              id="res-file"
              name="file"
              type="file"
              accept={acceptedFileTypes[resourceType] ?? "*"}
              onChange={handleFileChange}
              className="block w-full cursor-pointer text-sm text-muted-foreground
                file:mr-3 file:cursor-pointer file:rounded-md file:border-0
                file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium
                file:text-primary-foreground hover:file:bg-primary/90"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {fileTypeDescriptions[resourceType] ?? "Selecciona un archivo"}
            </p>
          </div>
          {fileSizeError && (
            <p className="text-sm text-destructive">{fileSizeError}</p>
          )}
        </div>
      )}

      {/* External URL — video_link */}
      {showExternalUrl && (
        <div className="space-y-2">
          <Label htmlFor="res-external-url">
            URL del video <span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Input
            id="res-external-url"
            name="external_url"
            type="url"
            defaultValue={toText(item?.external_url) ?? ""}
            required={showExternalUrl}
            placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
          />
          <p className="text-xs text-muted-foreground">
            Enlace a YouTube, Vimeo u otro servicio de video.
          </p>
        </div>
      )}

      {/* Content — text type */}
      {showContent && (
        <div className="space-y-2">
          <Label htmlFor="res-content">
            Contenido <span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Textarea
            id="res-content"
            name="content"
            rows={8}
            defaultValue={toText(item?.content) ?? ""}
            required={showContent}
            placeholder="Escribe el contenido del recurso aquí..."
            className="resize-y"
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
  unions,
  localFields,
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
  const [createFileSizeError, setCreateFileSizeError] = useState<string | null>(null);

  const [createState, createFormAction] = useActionState<ResourceActionState, FormData>(
    createAction,
    {},
  );
  const [updateState, updateFormAction] = useActionState<ResourceActionState, FormData>(
    updateAction,
    {},
  );
  const [deleteState, deleteFormAction] = useActionState<ResourceActionState, FormData>(
    deleteAction,
    {},
  );

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
      if (mode === "replace") {
        router.replace(nextUrl);
        return;
      }
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

  async function handleOpenSignedUrl(item: ResourceRecord) {
    const id = pickId(item);
    if (!id) return;
    const type = pickResourceType(item);
    const externalUrl = toText(item.external_url as string);

    if (type === "video_link" && externalUrl && /^https?:\/\//i.test(externalUrl)) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // For file-based resources, fetch a signed URL through the authenticated client
    try {
      const result = await apiRequestFromClient<{ signed_url?: string; url?: string }>(
        `/resources/${id}/signed-url`,
      );
      const url = result.signed_url ?? result.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("No se pudo obtener el enlace de descarga. Intenta de nuevo.");
    }
  }

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
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  router.push(pathname);
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max flex-wrap items-end gap-3">
              {/* Search */}
              <div className="w-[260px] space-y-1">
                <Label htmlFor="res-filter-search" className="text-xs font-medium text-muted-foreground">
                  Buscar
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="res-filter-search"
                    placeholder="Buscar por título..."
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    className="bg-background pl-8 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Type */}
              <div className="w-[170px] space-y-1">
                <Label htmlFor="res-filter-type" className="text-xs font-medium text-muted-foreground">
                  Tipo
                </Label>
                <Select
                  value={currentTypeFilter}
                  onValueChange={(v) => updateParam("resource_type", v)}
                >
                  <SelectTrigger id="res-filter-type" className="bg-background h-8 text-sm">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {(Object.entries(RESOURCE_TYPE_LABELS) as [ResourceType, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Scope */}
              <div className="w-[170px] space-y-1">
                <Label htmlFor="res-filter-scope" className="text-xs font-medium text-muted-foreground">
                  Alcance
                </Label>
                <Select
                  value={currentScopeFilter}
                  onValueChange={(v) => updateParam("scope_level", v)}
                >
                  <SelectTrigger id="res-filter-scope" className="bg-background h-8 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los alcances</SelectItem>
                    {(Object.entries(SCOPE_LEVEL_LABELS) as [ScopeLevel, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div className="w-[190px] space-y-1">
                  <Label htmlFor="res-filter-category" className="text-xs font-medium text-muted-foreground">
                    Categoría
                  </Label>
                  <Select
                    value={currentCategoryFilter}
                    onValueChange={(v) => updateParam("category_id", v)}
                  >
                    <SelectTrigger id="res-filter-category" className="bg-background h-8 text-sm">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem
                          key={cat.resource_category_id}
                          value={String(cat.resource_category_id)}
                        >
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Club Type */}
              <div className="w-[185px] space-y-1">
                <Label htmlFor="res-filter-club-type" className="text-xs font-medium text-muted-foreground">
                  Tipo de club
                </Label>
                <Select
                  value={currentClubTypeFilter}
                  onValueChange={(v) => updateParam("club_type", v)}
                >
                  <SelectTrigger id="res-filter-club-type" className="bg-background h-8 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los clubes</SelectItem>
                    {(Object.entries(CLUB_TYPE_LABELS) as [ClubTypeTarget, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
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
                ? "Ningún recurso coincide con los filtros aplicados. Intenta ajustarlos."
                : "Sube el primer recurso para ponerlo a disposición de los clubes."
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
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="min-w-[200px] h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Título
                    </TableHead>
                    <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Tipo
                    </TableHead>
                    <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Categoría
                    </TableHead>
                    <TableHead className="min-w-[160px] h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Alcance
                    </TableHead>
                    <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Club
                    </TableHead>
                    <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Subido por
                    </TableHead>
                    <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Fecha
                    </TableHead>
                    <TableHead className="sticky right-0 z-20 w-[110px] border-l bg-card h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const itemId = pickId(item);
                    const title = pickTitle(item);
                    const type = pickResourceType(item);
                    const categoryName = pickCategoryName(item);
                    const uploader = pickUploader(item);
                    const scopeLevel = pickScopeLevel(item);
                    const scopeId = pickScopeId(item);
                    const clubType = pickClubType(item);
                    const fileSize = formatFileSize(item.file_size);
                    const rowKey = itemId
                      ? `res-${itemId}`
                      : `res-row-${(safePage - 1) * safeLimit + idx}`;

                    return (
                      <TableRow key={rowKey} className="transition-colors hover:bg-muted/30">
                        <TableCell className="px-3 py-2.5 align-middle">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">{title}</span>
                            {fileSize && (
                              <span className="text-xs text-muted-foreground">{fileSize}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle">
                          <ResourceTypeBadge type={type} />
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                          {categoryName}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle">
                          <ScopeBadge
                            level={scopeLevel}
                            scopeId={scopeId}
                            unions={unions}
                            localFields={localFields}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                          {clubType ? CLUB_TYPE_LABELS[clubType] ?? "—" : "Todos"}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                          {uploader}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                          {formatDate(item.created_at)}
                        </TableCell>
                        <TableCell className="sticky right-0 z-10 border-l bg-card px-3 py-2.5 align-middle">
                          {/* Desktop: icon buttons */}
                          <div className="hidden items-center gap-0.5 md:flex">
                            {type !== "text" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-foreground"
                                    disabled={!itemId}
                                    onClick={() => handleOpenSignedUrl(item)}
                                  >
                                    {type === "video_link" ? (
                                      <ExternalLink className="size-3.5" />
                                    ) : (
                                      <Download className="size-3.5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {type === "video_link" ? "Abrir enlace" : "Descargar"}
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {canEdit && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-foreground"
                                    disabled={!itemId}
                                    onClick={() => setEditItem(item)}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                            )}

                            {canDelete && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-destructive/70 hover:text-destructive"
                                    disabled={!itemId}
                                    onClick={() => setDeleteItem(item)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          {/* Mobile: dropdown */}
                          <div className="md:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  title="Acciones"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {type !== "text" && (
                                  <DropdownMenuItem
                                    disabled={!itemId}
                                    onSelect={() => handleOpenSignedUrl(item)}
                                  >
                                    {type === "video_link" ? (
                                      <ExternalLink className="size-4" />
                                    ) : (
                                      <Download className="size-4" />
                                    )}
                                    {type === "video_link" ? "Abrir enlace" : "Descargar"}
                                  </DropdownMenuItem>
                                )}
                                {(canEdit || canDelete) && <DropdownMenuSeparator />}
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
      {/* Excepción documentada al Design System: se usa Dialog en lugar de páginas dedicadas
          porque el formulario es relativamente simple y el file upload se beneficia de
          mantener el contexto de la lista. Ver design system §CRUD patterns. */}
      {canCreate && (
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) setCreateFileSizeError(null);
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Subir recurso</DialogTitle>
              <DialogDescription>
                Completa los campos para registrar el nuevo recurso en el sistema.
              </DialogDescription>
            </DialogHeader>
            <form action={createFormAction} encType="multipart/form-data" className="space-y-4">
              {createOpen && createState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createState.error}
                </div>
              )}
              <ResourceFormFields
                categories={categories}
                unions={unions}
                localFields={localFields}
                onFileSizeError={setCreateFileSizeError}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <SubmitButton label="Subir recurso" extraDisabled={!!createFileSizeError} />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {/* Excepción documentada al Design System: se usa Dialog en lugar de páginas dedicadas
          porque el formulario es relativamente simple y el file upload se beneficia de
          mantener el contexto de la lista. Ver design system §CRUD patterns. */}
      {canEdit && editItem && (
        <Dialog
          open={!!editItem}
          onOpenChange={(open) => {
            if (!open) setEditItem(null);
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar recurso</DialogTitle>
              <DialogDescription>
                Modifica los metadatos del recurso. Para cambiar el archivo, elimínalo y vuelve a
                subirlo.
              </DialogDescription>
            </DialogHeader>
            <form action={updateFormAction} className="space-y-4">
              <input type="hidden" name="id" value={String(pickId(editItem) ?? "")} />
              {!!editItem && updateState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {updateState.error}
                </div>
              )}
              <ResourceFormFields
                item={editItem}
                categories={categories}
                unions={unions}
                localFields={localFields}
                isEdit
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

      {/* Delete Alert */}
      {canDelete && deleteItem && (
        <AlertDialog
          open={!!deleteItem}
          onOpenChange={(open) => {
            if (!open) setDeleteItem(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar recurso?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará el recurso{" "}
                <span className="font-medium text-foreground">
                  &quot;{pickTitle(deleteItem)}&quot;
                </span>
                . El archivo asociado también será removido. Esta acción no se puede deshacer.
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
