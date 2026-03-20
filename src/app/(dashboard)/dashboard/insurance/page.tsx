import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { InsuranceView } from "@/components/insurance/insurance-view";
import { ApiError, apiRequest } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import type { MemberInsurance } from "@/lib/api/insurance";

// ─── Types ─────────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

type Club = {
  club_id: number;
  name: string;
};

type Section = {
  club_section_id: number;
  club_type_id: number;
  name: string;
};

// ─── Normalizers ───────────────────────────────────────────────────────────────

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

function normalizeClub(raw: AnyRecord): Club {
  return {
    club_id: Number(raw.club_id ?? raw.id ?? 0),
    name: String(raw.name ?? `Club ${raw.club_id ?? "?"}`),
  };
}

function normalizeSection(raw: AnyRecord): Section {
  return {
    club_section_id: Number(raw.club_section_id ?? raw.id ?? 0),
    name: String(raw.name ?? `Sección ${raw.club_section_id ?? "?"}`),
    club_type_id: Number(raw.club_type_id ?? 0),
  };
}

function normalizeMemberInsurance(raw: AnyRecord): MemberInsurance {
  const ins =
    raw.insurance && typeof raw.insurance === "object"
      ? (raw.insurance as AnyRecord)
      : null;

  return {
    user_id: String(raw.user_id ?? ""),
    name: typeof raw.name === "string" ? raw.name : null,
    paternal_last_name:
      typeof raw.paternal_last_name === "string" ? raw.paternal_last_name : null,
    maternal_last_name:
      typeof raw.maternal_last_name === "string" ? raw.maternal_last_name : null,
    user_image: typeof raw.user_image === "string" ? raw.user_image : null,
    current_class:
      raw.current_class && typeof raw.current_class === "object"
        ? { name: String((raw.current_class as AnyRecord).name ?? "") }
        : null,
    insurance: ins
      ? {
          insurance_id: Number(ins.insurance_id ?? 0),
          insurance_type:
            (ins.insurance_type as NonNullable<MemberInsurance["insurance"]>["insurance_type"]) ??
            null,
          policy_number:
            typeof ins.policy_number === "string" ? ins.policy_number : null,
          provider: typeof ins.provider === "string" ? ins.provider : null,
          start_date:
            typeof ins.start_date === "string" ? ins.start_date : null,
          end_date: typeof ins.end_date === "string" ? ins.end_date : null,
          coverage_amount:
            ins.coverage_amount != null ? Number(ins.coverage_amount) : null,
          active: typeof ins.active === "boolean" ? ins.active : null,
          evidence_file_url:
            typeof ins.evidence_file_url === "string"
              ? ins.evidence_file_url
              : null,
          evidence_file_name:
            typeof ins.evidence_file_name === "string"
              ? ins.evidence_file_name
              : null,
          created_at:
            typeof ins.created_at === "string" ? ins.created_at : null,
          modified_at:
            typeof ins.modified_at === "string" ? ins.modified_at : null,
          created_by_name:
            typeof ins.created_by_name === "string"
              ? ins.created_by_name
              : null,
          modified_by_name:
            typeof ins.modified_by_name === "string"
              ? ins.modified_by_name
              : null,
        }
      : null,
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function InsurancePage() {
  await requireAdminUser();

  let clubs: Club[] = [];
  let sectionsByClub: Record<number, Section[]> = {};
  let initialMembers: MemberInsurance[] = [];
  let initialSectionId: number | null = null;
  let loadError: string | null = null;

  // 1. Load clubs
  try {
    const clubsPayload = await apiRequest<unknown>("/clubs");
    const rawClubs = extractArray(clubsPayload);
    clubs = rawClubs.map(normalizeClub).filter((c) => c.club_id > 0);
  } catch (err) {
    loadError =
      err instanceof ApiError
        ? err.message
        : "No se pudo cargar la lista de clubes.";
  }

  // 2. Load sections for all clubs
  if (clubs.length > 0 && !loadError) {
    const sectionPromises = clubs.map(async (club) => {
      try {
        const payload = await apiRequest<unknown>(
          `/clubs/${club.club_id}/sections`,
        );
        const rawSections = extractArray(payload);
        return {
          clubId: club.club_id,
          sections: rawSections.map(normalizeSection),
        };
      } catch {
        return { clubId: club.club_id, sections: [] };
      }
    });

    const sectionsResults = await Promise.all(sectionPromises);
    sectionsByClub = Object.fromEntries(
      sectionsResults.map(({ clubId, sections }) => [clubId, sections]),
    );

    // 3. Pre-load first section insurances
    const firstClub = clubs[0];
    if (firstClub) {
      const firstSections = sectionsByClub[firstClub.club_id] ?? [];
      const firstSection = firstSections[0];
      if (firstSection) {
        initialSectionId = firstSection.club_section_id;
        try {
          const payload = await apiRequest<unknown>(
            `/clubs/${firstClub.club_id}/sections/${firstSection.club_section_id}/members/insurance`,
          );
          const rawMembers = extractArray(payload);
          initialMembers = rawMembers.map(normalizeMemberInsurance);
        } catch {
          initialMembers = [];
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seguros"
        description="Gestión de seguros de miembros por sección de club."
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && clubs.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="No hay clubes registrados"
          description="Registra al menos un club para gestionar los seguros de sus miembros."
        />
      )}

      {!loadError && clubs.length > 0 && (
        <InsuranceView
          clubs={clubs}
          sectionsByClub={sectionsByClub}
          initialMembers={initialMembers}
          initialClubId={clubs[0]?.club_id ?? null}
          initialSectionId={initialSectionId}
        />
      )}
    </div>
  );
}
