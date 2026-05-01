"use client";

import { useState, useCallback } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActivitiesTable } from "@/components/activities/activities-table";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { DeleteActivityDialog } from "@/components/activities/delete-activity-dialog";
import { apiRequestFromClient, ApiError } from "@/lib/api/client";
import type { Activity } from "@/lib/api/activities";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Club = {
  club_id: number;
  name: string;
};

type Section = {
  club_section_id: number;
  name: string;
  club_type_id: number;
};

type ActivityTypeOption = {
  value: number;
  label: string;
};

const ACTIVITY_TYPES: ActivityTypeOption[] = [
  { value: 1, label: "Regular" },
  { value: 2, label: "Especial" },
  { value: 3, label: "Camporee" },
];

// ─── Normalize helpers ─────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) {
      const data = root.data as AnyRecord[];
      // Handle { data: { data: [] } }
      if (data.length === 0) return data;
      const first = data[0];
      if (first && typeof first === "object" && !("activity_id" in first) && Array.isArray((first as AnyRecord).data)) {
        return (first as AnyRecord).data as AnyRecord[];
      }
      return data;
    }
  }
  return [];
}

function normalizeActivity(raw: AnyRecord): Activity {
  return {
    activity_id: Number(raw.activity_id ?? raw.id ?? 0),
    name: String(raw.name ?? ""),
    description: typeof raw.description === "string" ? raw.description : null,
    club_id: Number(raw.club_id ?? 0),
    club_type_id: Number(raw.club_type_id ?? 0),
    club_section_id: Number(raw.club_section_id ?? 0),
    lat: Number(raw.lat ?? 0),
    long: Number(raw.long ?? 0),
    activity_time: typeof raw.activity_time === "string" ? raw.activity_time : null,
    activity_place: String(raw.activity_place ?? ""),
    image: typeof raw.image === "string" ? raw.image : null,
    platform: typeof raw.platform === "number" ? raw.platform : null,
    activity_type_id: Number(raw.activity_type_id ?? 0),
    activity_type:
      raw.activity_type && typeof raw.activity_type === "object"
        ? (raw.activity_type as Activity["activity_type"])
        : null,
    link_meet: typeof raw.link_meet === "string" ? raw.link_meet : null,
    additional_data: typeof raw.additional_data === "string" ? raw.additional_data : null,
    classes: Array.isArray(raw.classes) ? (raw.classes as number[]) : [],
    active: raw.active !== false,
    created_at: typeof raw.created_at === "string" ? raw.created_at : null,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : null,
  };
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ActivitiesViewProps {
  clubs: Club[];
  /** Sections keyed by club_id */
  sectionsByClub: Record<number, Section[]>;
  /** Initial activities for the first club (server-fetched) */
  initialActivities: Activity[];
  initialClubId: number | null;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ActivitiesView({
  clubs,
  sectionsByClub,
  initialActivities,
  initialClubId,
}: ActivitiesViewProps) {
  const [selectedClubId, setSelectedClubId] = useState<number | null>(initialClubId);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [filterTypeId, setFilterTypeId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);

  const sections = selectedClubId ? (sectionsByClub[selectedClubId] ?? []) : [];

  const loadActivities = useCallback(
    async (clubId: number, typeId?: number | null) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const params: Record<string, string | number | boolean> = {};
        if (typeId) params.activityTypeId = typeId;

        const payload = await apiRequestFromClient<unknown>(
          `/clubs/${clubId}/activities`,
          { params },
        );
        const raw = extractArray(payload);
        setActivities(raw.map(normalizeActivity));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar las actividades";
        setLoadError(message);
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  function handleClubChange(value: string) {
    const clubId = Number(value);
    setSelectedClubId(clubId);
    setFilterTypeId(null);
    loadActivities(clubId, null);
  }

  function handleTypeFilter(value: string) {
    const typeId = value === "all" ? null : Number(value);
    setFilterTypeId(typeId);
    if (selectedClubId) {
      loadActivities(selectedClubId, typeId);
    }
  }

  function handleRefresh() {
    if (selectedClubId) {
      loadActivities(selectedClubId, filterTypeId);
    }
  }

  function handleCreate() {
    setEditingActivity(null);
    setFormOpen(true);
  }

  function handleEdit(activity: Activity) {
    setEditingActivity(activity);
    setFormOpen(true);
  }

  function handleDelete(activity: Activity) {
    setDeletingActivity(activity);
    setDeleteOpen(true);
  }

  function handleSuccess() {
    if (selectedClubId) {
      loadActivities(selectedClubId, filterTypeId);
    }
  }

  const filteredActivities = activities;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Club selector */}
          <Select
            value={selectedClubId ? String(selectedClubId) : ""}
            onValueChange={handleClubChange}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Seleccionar club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((club) => (
                <SelectItem key={club.club_id} value={String(club.club_id)}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Activity type filter */}
          <Select
            value={filterTypeId ? String(filterTypeId) : "all"}
            onValueChange={handleTypeFilter}
            disabled={!selectedClubId}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={String(t.value)}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={!selectedClubId || isLoading}
            title="Actualizar"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">Actualizar</span>
          </Button>
        </div>

        <Button onClick={handleCreate} disabled={!selectedClubId} size="sm">
          <Plus className="size-4" />
          Nueva actividad
        </Button>
      </div>

      {/* Error */}
      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Count */}
      {selectedClubId && !loadError && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{filteredActivities.length}</span>{" "}
          {filteredActivities.length === 1 ? "actividad encontrada" : "actividades encontradas"}
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Cargando actividades...
        </div>
      ) : (
        <ActivitiesTable
          items={filteredActivities}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Dialogs */}
      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        clubId={selectedClubId ?? 0}
        sections={sections}
        activity={editingActivity}
        onSuccess={handleSuccess}
      />

      <DeleteActivityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        activity={deletingActivity}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
