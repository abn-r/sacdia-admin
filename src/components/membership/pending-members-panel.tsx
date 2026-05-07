"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PendingMembersTable } from "@/components/membership/pending-members-table";
import {
  listMembershipRequestsFromClient,
} from "@/lib/api/membership-requests";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = {
  club_section_id?: number;
  club_type_id?: number;
  club_type?: { name?: string } | null;
  name?: string;
  active?: boolean;
};

interface PendingMembersPanelProps {
  sections: Section[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PendingMembersPanel({ sections }: PendingMembersPanelProps) {
  const activeSections = sections.filter((s) => s.active !== false && s.club_section_id);

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    activeSections[0]?.club_section_id ?? null,
  );

  const {
    data: requests = [],
    isFetching: isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["membership-requests", selectedSectionId],
    queryFn: () => listMembershipRequestsFromClient(selectedSectionId!),
    enabled: selectedSectionId !== null,
    staleTime: 30_000,
  });

  const loadError =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? "No se pudieron cargar las solicitudes de membresía."
        : null;

  if (activeSections.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Sin secciones activas"
        description="Este club no tiene secciones activas. Crea una sección para poder gestionar solicitudes de membresía."
      />
    );
  }

  const getSectionLabel = (section: Section): string => {
    return section.name ?? section.club_type?.name ?? `Sección ${section.club_section_id}`;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Solicitudes de membresía pendientes de aprobación. Los usuarios que se
        registran en la app quedan en estado pendiente hasta que un director o
        líder del club apruebe su ingreso.
      </p>

      {/* Section selector */}
      {activeSections.length > 1 && (
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="section-select">Sección</Label>
          <Select
            value={String(selectedSectionId)}
            onValueChange={(value) => setSelectedSectionId(Number(value))}
          >
            <SelectTrigger id="section-select">
              <SelectValue placeholder="Seleccionar sección" />
            </SelectTrigger>
            <SelectContent>
              {activeSections.map((section) => (
                <SelectItem
                  key={section.club_section_id}
                  value={String(section.club_section_id)}
                >
                  {getSectionLabel(section)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {activeSections.length === 1 && (
        <p className="text-sm font-medium">
          {getSectionLabel(activeSections[0])}
        </p>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-md border p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16 ml-auto" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !loadError && selectedSectionId && (
        <PendingMembersTable
          key={selectedSectionId}
          clubSectionId={selectedSectionId}
          initialRequests={requests}
        />
      )}
    </div>
  );
}
