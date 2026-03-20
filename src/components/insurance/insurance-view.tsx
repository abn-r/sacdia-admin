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
import { InsuranceTable } from "@/components/insurance/insurance-table";
import { InsuranceFormDialog } from "@/components/insurance/insurance-form-dialog";
import { DeleteInsuranceDialog } from "@/components/insurance/delete-insurance-dialog";
import { apiRequestFromClient, ApiError } from "@/lib/api/client";
import type { MemberInsurance } from "@/lib/api/insurance";

// ─── Types ────────────────────────────────────────────────────────────────────

type Club = {
  club_id: number;
  name: string;
};

type Section = {
  club_section_id: number;
  club_type_id: number;
  name: string;
};

// ─── Normalize helpers ────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

function normalizeMemberInsurance(raw: AnyRecord): MemberInsurance {
  const ins = raw.insurance && typeof raw.insurance === "object"
    ? (raw.insurance as AnyRecord)
    : null;

  return {
    user_id: String(raw.user_id ?? ""),
    name: typeof raw.name === "string" ? raw.name : null,
    paternal_last_name: typeof raw.paternal_last_name === "string" ? raw.paternal_last_name : null,
    maternal_last_name: typeof raw.maternal_last_name === "string" ? raw.maternal_last_name : null,
    user_image: typeof raw.user_image === "string" ? raw.user_image : null,
    current_class:
      raw.current_class && typeof raw.current_class === "object"
        ? { name: String((raw.current_class as AnyRecord).name ?? "") }
        : null,
    insurance: ins
      ? {
          insurance_id: Number(ins.insurance_id ?? 0),
          insurance_type: (ins.insurance_type as NonNullable<MemberInsurance["insurance"]>["insurance_type"]) ?? null,
          policy_number: typeof ins.policy_number === "string" ? ins.policy_number : null,
          provider: typeof ins.provider === "string" ? ins.provider : null,
          start_date: typeof ins.start_date === "string" ? ins.start_date : null,
          end_date: typeof ins.end_date === "string" ? ins.end_date : null,
          coverage_amount: ins.coverage_amount != null ? Number(ins.coverage_amount) : null,
          active: typeof ins.active === "boolean" ? ins.active : null,
          evidence_file_url: typeof ins.evidence_file_url === "string" ? ins.evidence_file_url : null,
          evidence_file_name: typeof ins.evidence_file_name === "string" ? ins.evidence_file_name : null,
          created_at: typeof ins.created_at === "string" ? ins.created_at : null,
          modified_at: typeof ins.modified_at === "string" ? ins.modified_at : null,
          created_by_name: typeof ins.created_by_name === "string" ? ins.created_by_name : null,
          modified_by_name: typeof ins.modified_by_name === "string" ? ins.modified_by_name : null,
        }
      : null,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface InsuranceViewProps {
  clubs: Club[];
  sectionsByClub: Record<number, Section[]>;
  initialMembers: MemberInsurance[];
  initialClubId: number | null;
  initialSectionId: number | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InsuranceView({
  clubs,
  sectionsByClub,
  initialMembers,
  initialClubId,
  initialSectionId,
}: InsuranceViewProps) {
  const [selectedClubId, setSelectedClubId] = useState<number | null>(initialClubId);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(initialSectionId);
  const [members, setMembers] = useState<MemberInsurance[]>(initialMembers);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberInsurance | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState<MemberInsurance | null>(null);

  const sections = selectedClubId ? (sectionsByClub[selectedClubId] ?? []) : [];

  const loadInsurances = useCallback(async (clubId: number, sectionId: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const payload = await apiRequestFromClient<unknown>(
        `/clubs/${clubId}/sections/${sectionId}/members/insurance`,
      );
      const raw = extractArray(payload);
      setMembers(raw.map(normalizeMemberInsurance));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los seguros";
      setLoadError(message);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleClubChange(value: string) {
    const clubId = Number(value);
    setSelectedClubId(clubId);
    setSelectedSectionId(null);
    setMembers([]);
    setLoadError(null);
  }

  function handleSectionChange(value: string) {
    const sectionId = Number(value);
    setSelectedSectionId(sectionId);
    if (selectedClubId) {
      loadInsurances(selectedClubId, sectionId);
    }
  }

  function handleRefresh() {
    if (selectedClubId && selectedSectionId) {
      loadInsurances(selectedClubId, selectedSectionId);
    }
  }

  function handleCreateForSection() {
    // Open form with a blank member to create by entering user_id manually
    // In this flow, we don't have a specific member — user picks from table
    setEditingMember(null);
    setFormOpen(true);
  }

  function handleEdit(member: MemberInsurance) {
    setEditingMember(member);
    setFormOpen(true);
  }

  function handleDelete(member: MemberInsurance) {
    setDeletingMember(member);
    setDeleteOpen(true);
  }

  function handleSuccess() {
    if (selectedClubId && selectedSectionId) {
      loadInsurances(selectedClubId, selectedSectionId);
    }
  }

  const insuredCount = members.filter((m) => m.insurance !== null).length;

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

          {/* Section selector */}
          <Select
            value={selectedSectionId ? String(selectedSectionId) : ""}
            onValueChange={handleSectionChange}
            disabled={!selectedClubId || sections.length === 0}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Seleccionar sección" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s.club_section_id} value={String(s.club_section_id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={!selectedSectionId || isLoading}
            title="Actualizar"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Prompt to select section */}
      {!selectedSectionId && !loadError && (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Selecciona un club y una sección para ver los seguros.
        </div>
      )}

      {/* Count */}
      {selectedSectionId && !loadError && !isLoading && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{insuredCount}</span>{" "}
          de{" "}
          <span className="font-medium text-foreground">{members.length}</span>{" "}
          {members.length === 1 ? "miembro" : "miembros"} con seguro registrado
        </p>
      )}

      {/* Table */}
      {selectedSectionId && (
        isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Cargando seguros...
          </div>
        ) : (
          <InsuranceTable
            items={members}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )
      )}

      {/* Dialogs */}
      <InsuranceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editingMember}
        onSuccess={handleSuccess}
      />

      <DeleteInsuranceDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        member={deletingMember}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
