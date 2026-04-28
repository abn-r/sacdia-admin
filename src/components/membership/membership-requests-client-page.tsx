"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
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
  type MembershipRequest,
} from "@/lib/api/membership-requests";
import { ApiError } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionOption = {
  club_section_id: number;
  label: string;
};

interface MembershipRequestsClientPageProps {
  sections: SectionOption[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembershipRequestsClientPage({
  sections,
}: MembershipRequestsClientPageProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<number>(
    sections[0]?.club_section_id ?? 0,
  );
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRequests = useCallback(async (sectionId: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listMembershipRequestsFromClient(sectionId);
      setRequests(data);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
        setLoadError("No tienes permisos para ver solicitudes de esta sección.");
      } else {
        const message =
          error instanceof ApiError
            ? error.message
            : "No se pudieron cargar las solicitudes.";
        setLoadError(message);
      }
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      loadRequests(selectedSectionId);
    }
  }, [selectedSectionId, loadRequests]);

  return (
    <div className="space-y-4">
      {/* Section selector */}
      <div className="max-w-md space-y-1.5">
        <Label htmlFor="section-select">Sección de club</Label>
        <Select
          value={String(selectedSectionId)}
          onValueChange={(value) => setSelectedSectionId(Number(value))}
        >
          <SelectTrigger id="section-select">
            <SelectValue placeholder="Seleccionar sección" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem
                key={section.club_section_id}
                value={String(section.club_section_id)}
              >
                {section.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-md border p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-8 w-16" />
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
      {!isLoading && !loadError && selectedSectionId > 0 && (
        <PendingMembersTable
          key={selectedSectionId}
          clubSectionId={selectedSectionId}
          initialRequests={requests}
        />
      )}
    </div>
  );
}
