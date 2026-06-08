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
  RefreshCcw,
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
import {
  formatClassAvailabilityUntil,
  formatClassDurationRange,
  type ClassDisplayLabels,
} from "@/lib/classes/display";
import { useFormStatus } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  MasterHonorRulesEditor,
  type MasterHonorAuxCategory,
  type MasterHonorAuxDivision,
  type MasterHonorAuxHonor,
} from "@/components/catalogs/master-honor-rules-editor";
import type {
  MasterHonorPayload,
  MasterHonorRuleGroupPayload,
  MasterHonorRuleGroupType,
} from "@/lib/api/phase-e-catalogs";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;
type FormAction = (prev: PhaseEActionState, data: FormData) => Promise<PhaseEActionState>;

type MasterHonorsCrudExtras = {
  honors: MasterHonorAuxHonor[];
  honorCategories: MasterHonorAuxCategory[];
  divisions: MasterHonorAuxDivision[];
  recalculateAction?: FormAction;
};

type MasterHonorRawRecord = {
  philosophy?: unknown;
  notes?: unknown;
  applicability_scope?: unknown;
  division_ids?: unknown;
  master_honor_divisions?: unknown;
  requirement_groups?: unknown;
};

const EMPTY_MASTER_HONOR_PAYLOAD: MasterHonorPayload = {
  applicability_scope: "ALL",
  division_ids: [],
  requirement_groups: [],
};

export type ClassConfigYearOption = {
  ecclesiastical_year_id: number;
  name: string;
};

export interface PhaseECatalogCrudPageProps {
  /** Page title shown in PageHeader */
  title: string;
  /** Page description shown in PageHeader */
  description?: string;
  /** Noun used in dialog headers and button labels (singular) */
  entityLabel: string;
  /** Icon shown in EmptyState. Must be a pre-rendered ReactNode (e.g. `<Network />`) so it crosses the server→client boundary. */
  emptyIcon: ReactNode;
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
  /** Enables class-specific availability/duration fields and columns. */
  classConfigYearOptions?: ClassConfigYearOption[];
  /** Optional master-honors extras to render rule controls and recalc action. */
  masterHonorsConfig?: MasterHonorsCrudExtras;
}

// ─── SubmitButton ─────────────────────────────────────────────────────────────

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("catalogs.phaseE");
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {t("delete")}
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
  classConfigYearOptions?: ClassConfigYearOption[];
  masterHonorsConfig?: MasterHonorsCrudExtras;
  masterHonorsPayload?: MasterHonorPayload;
  onMasterHonorsPayloadChange?: (value: MasterHonorPayload) => void;
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
  classConfigYearOptions,
  masterHonorsConfig,
  masterHonorsPayload,
  onMasterHonorsPayloadChange,
}: FormFieldsProps) {
  const t = useTranslations("catalogs.phaseE");
  const nameVal = typeof item?.name === "string" ? item.name : "";
  const descVal = typeof item?.description === "string" ? item.description : "";
  const showClassConfig = Array.isArray(classConfigYearOptions);
  const availableFromVal = toPositiveInt(item?.available_from_year_id);
  const availableUntilVal = toPositiveInt(item?.available_until_year_id);
  const minDurationVal = toPositiveInt(item?.min_duration_years) ?? 1;
  const maxDurationVal = toPositiveInt(item?.max_duration_years) ?? 1;
  const yearOptions = [...(classConfigYearOptions ?? [])];
  for (const yearId of [availableFromVal, availableUntilVal]) {
    if (yearId && !yearOptions.some((year) => year.ecclesiastical_year_id === yearId)) {
      yearOptions.push({ ecclesiastical_year_id: yearId, name: `Año #${yearId}` });
    }
  }

  const esContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>
          {t("fieldName")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          defaultValue={nameVal}
          required
          placeholder={t("fieldNamePlaceholder", { entity: entityLabel.toLowerCase() })}
        />
      </div>

      {includeDescription && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-description`}>{t("fieldDescription")}</Label>
          <Textarea
            id={`${idPrefix}-description`}
            name="description"
            rows={3}
            defaultValue={descVal}
            placeholder={t("fieldDescriptionPlaceholder")}
          />
        </div>
      )}

      {showClassConfig && (
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="mb-4">
            <h4 className="text-sm font-semibold">{t("classConfigTitle")}</h4>
            <p className="text-xs text-muted-foreground">{t("classConfigDescription")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-available-from`}>
                {t("fieldAvailableFromYear")}
              </Label>
              <select
                id={`${idPrefix}-available-from`}
                name="available_from_year_id"
                defaultValue={availableFromVal ? String(availableFromVal) : ""}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t("fieldAvailableFromAny")}</option>
                {yearOptions.map((year) => (
                  <option
                    key={year.ecclesiastical_year_id}
                    value={String(year.ecclesiastical_year_id)}
                  >
                    {year.name || `Año #${year.ecclesiastical_year_id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-available-until`}>
                {t("fieldAvailableUntilYear")}
              </Label>
              <select
                id={`${idPrefix}-available-until`}
                name="available_until_year_id"
                defaultValue={availableUntilVal ? String(availableUntilVal) : ""}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t("fieldAvailableUntilNone")}</option>
                {yearOptions.map((year) => (
                  <option
                    key={year.ecclesiastical_year_id}
                    value={String(year.ecclesiastical_year_id)}
                  >
                    {year.name || `Año #${year.ecclesiastical_year_id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-min-duration`}>
                {t("fieldMinDurationYears")}
              </Label>
              <Input
                id={`${idPrefix}-min-duration`}
                name="min_duration_years"
                type="number"
                min={1}
                step={1}
                defaultValue={minDurationVal}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-max-duration`}>
                {t("fieldMaxDurationYears")}
              </Label>
              <Input
                id={`${idPrefix}-max-duration`}
                name="max_duration_years"
                type="number"
                min={1}
                step={1}
                defaultValue={maxDurationVal}
                required
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input type="hidden" name="active" value={activeChecked ? "on" : ""} />
        <Checkbox
          id={`${idPrefix}-active`}
          checked={activeChecked}
          onCheckedChange={(checked) => onActiveChange(!!checked)}
        />
        <Label htmlFor={`${idPrefix}-active`}>{t("fieldActive")}</Label>
      </div>

      {masterHonorsConfig && masterHonorsPayload && onMasterHonorsPayloadChange ? (
        <MasterHonorRulesEditor
          value={masterHonorsPayload}
          onChange={onMasterHonorsPayloadChange}
          honors={masterHonorsConfig.honors}
          honorCategories={masterHonorsConfig.honorCategories}
          divisions={masterHonorsConfig.divisions}
        />
      ) : null}
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

function toNonNegativeInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function isMasterHonorGroupType(value: unknown): value is MasterHonorRuleGroupType {
  return value === "EXPLICIT_OPTIONS" || value === "CATEGORY_COUNT";
}

function normalizeText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizeMasterHonorsGroup(
  raw: unknown,
  fallbackDisplayOrder: number,
): MasterHonorRuleGroupPayload {
  if (!raw || typeof raw !== "object") {
    return {
      group_type: "EXPLICIT_OPTIONS",
      minimum_required: 0,
      display_order: fallbackDisplayOrder,
      options: [],
    };
  }

  const group = raw as Record<string, unknown>;
  const groupType = isMasterHonorGroupType(group.group_type)
    ? group.group_type
    : "EXPLICIT_OPTIONS";
  const minimumRequired = Math.max(0, toNonNegativeInt(group.minimum_required) ?? 0);
  const displayOrder = Math.max(0, toNonNegativeInt(group.display_order) ?? fallbackDisplayOrder);
  const title = normalizeText(group.title);
  const description = normalizeText(group.description);
  const groupId = toPositiveInt(group.group_id);
  const honorsCategoryId = toPositiveInt(group.honors_category_id);
  const rawOptions = Array.isArray(group.options) ? group.options : [];

  const options = groupType === "EXPLICIT_OPTIONS"
    ? rawOptions
      .filter(
        (option): option is Record<string, unknown> =>
          option !== null && typeof option === "object",
      )
      .map((option, index) => {
        const optionRecord = option as Record<string, unknown>;
        const optionId = toPositiveInt(optionRecord.option_id);
        const label = normalizeText(optionRecord.label) ?? "";
        const honorIdsFromFlat = Array.isArray(optionRecord.honor_ids)
          ? optionRecord.honor_ids.map((id) => toPositiveInt(id)).filter((value): value is number => value !== null)
          : [];

        const honorIdsFromNested = Array.isArray(optionRecord.honors)
          ? optionRecord.honors
            .map((honorRecord) => {
              if (typeof honorRecord === "number") {
                return toPositiveInt(honorRecord);
              }
              if (!honorRecord || typeof honorRecord !== "object") {
                return null;
              }
              const honorObject = honorRecord as Record<string, unknown>;
              if ("honor_id" in honorObject) {
                return toPositiveInt(honorObject.honor_id);
              }
              if (
                "honor" in honorObject &&
                honorObject.honor !== null &&
                typeof honorObject.honor === "object"
              ) {
                return toPositiveInt((honorObject.honor as Record<string, unknown>).honor_id);
              }
              return null;
            })
            .filter((value): value is number => value !== null)
          : [];

        const honor_ids = Array.from(new Set([
          ...honorIdsFromFlat,
          ...honorIdsFromNested,
        ]));

        return {
          ...(optionId ? { option_id: optionId } : {}),
          label,
          display_order: Math.max(0, toNonNegativeInt(optionRecord.display_order) ?? index + 1),
          honor_ids,
          ...(typeof optionRecord.active === "boolean" ? { active: optionRecord.active } : {}),
        };
      })
    : [];

  const normalized: MasterHonorRuleGroupPayload = {
    group_type: groupType,
    minimum_required: minimumRequired,
    display_order: displayOrder,
    options,
    ...(groupId ? { group_id: groupId } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(typeof group.active === "boolean" ? { active: group.active } : {}),
  };

  if (groupType === "CATEGORY_COUNT" && honorsCategoryId) {
    normalized.honors_category_id = honorsCategoryId;
  }

  return normalized;
}

function normalizeMasterHonorsDivisionIds(
  rawScope: unknown,
  rawDivisionIds: unknown,
  rawDivisionRecords: unknown,
): number[] {
  if (rawScope !== "SELECTED_DIVISIONS") return [];
  const flatIds = Array.isArray(rawDivisionIds)
    ? rawDivisionIds.map((id) => toPositiveInt(id)).filter((value): value is number => value !== null)
    : [];

  const nestedDivisionIds = Array.isArray(rawDivisionRecords)
    ? rawDivisionRecords
      .map((entry) =>
        entry && typeof entry === "object" && "division_id" in entry
          ? toPositiveInt((entry as Record<string, unknown>).division_id)
          : null,
      )
      .filter((value): value is number => value !== null)
    : [];

  return Array.from(new Set([...flatIds, ...nestedDivisionIds]));
}

function normalizeMasterHonorsPayload(item?: MasterHonorRawRecord | null): MasterHonorPayload {
  const requirementGroups = Array.isArray(item?.requirement_groups)
    ? item?.requirement_groups
    : [];

  return {
    ...(normalizeText(item?.philosophy) ? { philosophy: normalizeText(item?.philosophy) as string } : {}),
    ...(normalizeText(item?.notes) ? { notes: normalizeText(item?.notes) as string } : {}),
    applicability_scope:
      item?.applicability_scope === "SELECTED_DIVISIONS"
        ? "SELECTED_DIVISIONS"
        : "ALL",
    division_ids: normalizeMasterHonorsDivisionIds(
      item?.applicability_scope,
      item?.division_ids,
      item?.master_honor_divisions,
    ),
    requirement_groups: requirementGroups.map((group, index) =>
      normalizeMasterHonorsGroup(group, index + 1),
    ),
  };
}

function getMasterHonorsSummary(item: AnyRecord):
  | { kind: "empty" }
  | {
      kind: "configured";
      scope: "ALL" | "SELECTED_DIVISIONS";
      divisionCount: number;
      groupCount: number;
      minimumTotal: number;
    } {
  const scope = item.applicability_scope === "SELECTED_DIVISIONS"
    ? "SELECTED_DIVISIONS"
    : "ALL";
  const divisionIds = normalizeMasterHonorsDivisionIds(
    scope,
    item.division_ids,
    item.master_honor_divisions,
  );
  const groups = Array.isArray(item.requirement_groups) ? item.requirement_groups : [];
  const groupCount = groups.length;
  if (groupCount === 0) {
    return { kind: "empty" };
  }

  const minTotal = groups.reduce((total, rawGroup) => {
    if (!rawGroup || typeof rawGroup !== "object") return total;
    const group = rawGroup as Record<string, unknown>;
    const minimum = toNonNegativeInt(group.minimum_required);
    return total + (minimum ?? 0);
  }, 0);

  return {
    kind: "configured",
    scope,
    divisionCount: divisionIds.length,
    groupCount,
    minimumTotal: minTotal,
  };
}

export function PhaseECatalogCrudPage({
  title,
  description,
  entityLabel,
  emptyIcon,
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
  classConfigYearOptions,
  masterHonorsConfig,
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
  const [createMasterHonorsPayload, setCreateMasterHonorsPayload] = useState<MasterHonorPayload>(EMPTY_MASTER_HONOR_PAYLOAD);
  const [editMasterHonorsPayload, setEditMasterHonorsPayload] = useState<MasterHonorPayload>(EMPTY_MASTER_HONOR_PAYLOAD);

  const [createState, createFormAction] = useActionState<PhaseEActionState, FormData>(createAction, {});
  const [updateState, updateFormAction] = useActionState<PhaseEActionState, FormData>(updateAction, {});
  const [deleteState, deleteFormAction] = useActionState<PhaseEActionState, FormData>(deleteAction, {});
  const [recalculateState, recalculateFormAction] = useActionState<PhaseEActionState, FormData>(
    masterHonorsConfig?.recalculateAction ?? (async () => ({})),
    {},
  );

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

  const t = useTranslations("catalogs.phaseE");
  const displayT = useTranslations("classes.display");
  const masterHonorsT = useTranslations("catalogs.masterHonors");
  const displayLabels: ClassDisplayLabels = {
    yearSingular: displayT("yearSingular"),
    yearPlural: displayT("yearPlural"),
    yearFallback: (id) => displayT("yearFallback", { id }),
    availableFromAnyYear: displayT("availableFromAnyYear"),
    noProgrammedExpiration: displayT("noProgrammedExpiration"),
    availableFromYear: (label) => displayT("availableFromYear", { label }),
    availableUntilYear: (label) => displayT("availableUntilYear", { label }),
  };
  const hasActiveFilters = Boolean(currentSearch || currentStatusFilter !== "all");
  const canMutate = canCreate || canEdit || canDelete;
  const isMasterHonorsCrud = Boolean(masterHonorsConfig);
  const hasRecalculateAction = isMasterHonorsCrud && Boolean(masterHonorsConfig?.recalculateAction);
  const showClassConfig = Array.isArray(classConfigYearOptions);
  const yearNameById = new Map(
    (classConfigYearOptions ?? []).map((year) => [
      year.ecclesiastical_year_id,
      year.name || displayLabels.yearFallback(year.ecclesiastical_year_id),
    ]),
  );
  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);
  const idPrefix = "phaseE";

  function handleCreateOpen(open: boolean) {
    setCreateOpen(open);
    if (open) {
      setCreateActiveChecked(true);
      setCreateTranslations([]);
      setCreateMasterHonorsPayload(EMPTY_MASTER_HONOR_PAYLOAD);
      return;
    }
    setCreateMasterHonorsPayload(EMPTY_MASTER_HONOR_PAYLOAD);
  }

  function handleEditOpen(item: AnyRecord | null) {
    setEditItem(item);
    if (!item) {
      setEditMasterHonorsPayload(EMPTY_MASTER_HONOR_PAYLOAD);
      return;
    }

    setEditActiveChecked(item.active !== false);
    setEditTranslations(
      Array.isArray(item.translations) ? (item.translations as CatalogTranslation[]) : [],
    );
    setEditMasterHonorsPayload(normalizeMasterHonorsPayload(item as MasterHonorRawRecord));
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description}>
        {canCreate && (
          <Button onClick={() => handleCreateOpen(true)}>
            <Plus className="size-4" />
            {t("create", { entity: entityLabel.toLowerCase() })}
          </Button>
        )}
      </PageHeader>

      <div className="space-y-4">
        {/* Filter bar */}
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">{t("filtersTitle")}</h3>
            <span className="text-xs text-muted-foreground">{t("filtersSubtitle")}</span>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-end gap-4">
              <div className="w-[300px] space-y-1">
                <Label htmlFor={`${idPrefix}-filter-search`}>{t("filterName")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={`${idPrefix}-filter-search`}
                    placeholder={t("filterNamePlaceholder2")}
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    className="bg-background pl-9"
                  />
                </div>
              </div>
              <div className="w-[200px] space-y-1">
                <Label htmlFor={`${idPrefix}-filter-status`}>{t("filterStatus")}</Label>
                <Select
                  value={currentStatusFilter}
                  onValueChange={(v) => updateParam("active", v)}
                >
                  <SelectTrigger id={`${idPrefix}-filter-status`} className="bg-background">
                    <SelectValue placeholder={t("filterStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("statusAll")}</SelectItem>
                    <SelectItem value="true">{t("statusActive")}</SelectItem>
                    <SelectItem value="false">{t("statusInactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Table / empty state */}
        {items.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={hasActiveFilters ? t("noResults") : t("emptyTitle", { entity: entityLabel.toLowerCase() })}
            description={
              hasActiveFilters
                ? t("noResultsDesc", { entity: entityLabel.toLowerCase() })
                : t("emptyDesc")
            }
          >
            {canCreate && !hasActiveFilters && (
              <Button onClick={() => handleCreateOpen(true)}>
                <Plus className="size-4" />
                {t("create", { entity: entityLabel.toLowerCase() })}
              </Button>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colName")}</TableHead>
                    {includeDescription && <TableHead>{t("colDescription")}</TableHead>}
                    {showClassConfig && <TableHead>{t("colDuration")}</TableHead>}
                    {showClassConfig && <TableHead>{t("colAvailability")}</TableHead>}
                    {isMasterHonorsCrud && (
                      <TableHead>{masterHonorsT("colRulesSummary")}</TableHead>
                    )}
                    <TableHead>{t("colStatus")}</TableHead>
                    {(canEdit || canDelete) && (
                      <TableHead className="sticky right-0 z-20 w-[100px] border-l bg-background">
                        {t("colActions")}
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
                        {showClassConfig && (
                          <TableCell className="text-sm text-muted-foreground">
                            {formatClassDurationRange(
                              toPositiveInt(item.min_duration_years) ?? 1,
                              toPositiveInt(item.max_duration_years) ?? 1,
                              displayLabels,
                            )}
                          </TableCell>
                        )}
                        {showClassConfig && (
                          <TableCell className="max-w-[260px] text-sm text-muted-foreground">
                            {formatClassAvailabilityUntil(
                              toPositiveInt(item.available_until_year_id),
                              displayLabels,
                              yearNameById.get(toPositiveInt(item.available_until_year_id) ?? 0),
                            )}
                          </TableCell>
                        )}
                        {isMasterHonorsCrud ? (
                          <TableCell className="max-w-[260px] whitespace-pre-line text-sm text-muted-foreground">
                            {(() => {
                              const summary = getMasterHonorsSummary(item);
                              if (summary.kind === "empty") {
                                return masterHonorsT("rulesSummaryNoRules");
                              }
                              const scopeText = summary.scope === "ALL"
                                ? masterHonorsT("scopeAll")
                                : `${masterHonorsT("scopeSelected")} (${summary.divisionCount})`;
                              return `${scopeText} · ${masterHonorsT("summaryGroupCount", { count: summary.groupCount })} · ${masterHonorsT("summaryMinimumTotal", { count: summary.minimumTotal })}`;
                            })()}
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <Badge
                            variant={item.active !== false ? "soft-success" : "outline"}
                            className="text-xs"
                          >
                            {item.active !== false ? t("statusActive") : t("statusInactive")}
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
                                  onClick={() => handleEditOpen(item)}
                                  title={t("edit")}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              )}
                              {hasRecalculateAction && canEdit && itemId ? (
                                <form action={recalculateFormAction} className="inline">
                                  <input
                                    type="hidden"
                                    name="id"
                                    value={String(itemId)}
                                  />
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1.5"
                                  aria-label={masterHonorsT("recalculateNow")}
                                  title={masterHonorsT("recalculateNow")}
                                >
                                  <RefreshCcw className="size-3.5" />
                                  <span className="hidden md:inline">{masterHonorsT("recalculateNow")}</span>
                                </Button>
                              </form>
                            ) : null}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:text-destructive"
                                  disabled={!itemId}
                                  onClick={() => setDeleteItem(item)}
                                  title={t("delete")}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                            <div className="md:hidden">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8" title={t("colActions")}>
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                  {canEdit && (
                                    <DropdownMenuItem
                                      disabled={!itemId}
                                      onSelect={() => handleEditOpen(item)}
                                    >
                                      <Pencil className="size-4" />
                                      {t("edit")}
                                    </DropdownMenuItem>
                                  )}
                                  {hasRecalculateAction && canEdit && itemId ? (
                                    <DropdownMenuItem
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        const recalculateForm = document.getElementById(
                                          `recalculate-master-honor-${itemId}`,
                                        ) as HTMLFormElement | null;
                                        recalculateForm?.requestSubmit();
                                      }}
                                    >
                                      <RefreshCcw className="size-4" />
                                      {masterHonorsT("recalculateNow")}
                                    </DropdownMenuItem>
                                  ) : null}
                                  {canDelete && (
                                    <DropdownMenuItem
                                      disabled={!itemId}
                                      variant="destructive"
                                      onSelect={() => setDeleteItem(item)}
                                    >
                                      <Trash2 className="size-4" />
                                      {t("delete")}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {itemId && hasRecalculateAction ? (
                              <form
                                id={`recalculate-master-honor-${itemId}`}
                                action={recalculateFormAction}
                                className="sr-only"
                              >
                                <input type="hidden" name="id" value={String(itemId)} />
                              </form>
                            ) : null}
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
              <DialogTitle>{t("createDialogTitle", { entity: entityLabel.toLowerCase() })}</DialogTitle>
              <DialogDescription>
                {t("createDialogDesc", { entity: entityLabel.toLowerCase() })}
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
                classConfigYearOptions={classConfigYearOptions}
                masterHonorsConfig={masterHonorsConfig}
                masterHonorsPayload={createMasterHonorsPayload}
                onMasterHonorsPayloadChange={setCreateMasterHonorsPayload}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  {t("cancel")}
                </Button>
                <SubmitButton label={t("createSubmit")} />
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
              <DialogTitle>{t("editDialogTitle", { entity: entityLabel.toLowerCase() })}</DialogTitle>
              <DialogDescription>
                {t("createDialogDesc", { entity: entityLabel.toLowerCase() })}
              </DialogDescription>
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
                classConfigYearOptions={classConfigYearOptions}
                masterHonorsConfig={masterHonorsConfig}
                masterHonorsPayload={editMasterHonorsPayload}
                onMasterHonorsPayloadChange={setEditMasterHonorsPayload}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                  {t("cancel")}
                </Button>
                <SubmitButton label={t("saveChanges")} />
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
                {t("deleteDialogTitle", { entity: entityLabel.toLowerCase() })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDialogDesc", { name: getItemName(deleteItem) })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
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
          {t("noPermissions")}
        </div>
      )}

      {recalculateState.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {recalculateState.error}
        </p>
      ) : null}
    </div>
  );
}
