import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { InsuranceView } from "@/components/insurance/insurance-view";
import { ApiError, apiRequest } from "@/lib/api/client";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { LocalField } from "@/lib/api/geography";
import {
  getSectionInsuranceOverview,
  type SectionInsuranceOverview,
} from "@/lib/api/insurance";

// ─── Types ─────────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

type Club = {
  club_id: number;
  name: string;
  local_field_id?: number;
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
  const localFieldId = Number(raw.local_field_id ?? 0);
  return {
    club_id: Number(raw.club_id ?? raw.id ?? 0),
    name: String(raw.name ?? `Club ${raw.club_id ?? "?"}`),
    local_field_id: localFieldId > 0 ? localFieldId : undefined,
  };
}

function normalizeSection(raw: AnyRecord): Section {
  return {
    club_section_id: Number(raw.club_section_id ?? raw.id ?? 0),
    name: String(raw.name ?? `Sección ${raw.club_section_id ?? "?"}`),
    club_type_id: Number(raw.club_type_id ?? 0),
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("insurance");
  return { title: t("page.title") };
}

export default async function InsurancePage() {
  const user = await requireAdminUser();
  if (!canViewScreen(user, "insurance-by-section")) {
    redirect("/dashboard");
  }
  const t = await getTranslations("insurance");
  const territoryScope = resolveAdminTerritoryScope(user);

  let clubs: Club[] = [];
  let localFields: LocalField[] = [];
  let sectionsByClub: Record<number, Section[]> = {};
  let initialOverview: SectionInsuranceOverview | null = null;
  let initialSectionId: number | null = null;
  let initialLocalFieldId: number | "all" = "all";
  let loadError: string | null = null;

  const localFieldsResult = await listLocalFieldsForTerritory(user).catch(() => []);
  localFields = localFieldsResult;

  if (territoryScope.level === "local_field") {
    initialLocalFieldId = territoryScope.localFieldId;
  }

  // 1. Load clubs
  try {
    const clubsPayload = await apiRequest<unknown>("/clubs");
    const rawClubs = extractArray(clubsPayload);
    clubs = rawClubs.map(normalizeClub).filter((c) => c.club_id > 0);
  } catch (err) {
    loadError =
      err instanceof ApiError
        ? err.message
        : t("errors.failed_load_clubs");
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

    // 3. Pre-load first section overview
    const scopedClubs =
      initialLocalFieldId === "all"
        ? clubs
        : clubs.filter((club) => club.local_field_id === initialLocalFieldId);
    const firstClub = scopedClubs[0] ?? clubs[0];
    if (firstClub) {
      if (initialLocalFieldId === "all" && firstClub.local_field_id) {
        initialLocalFieldId = firstClub.local_field_id;
      }
      const firstSections = sectionsByClub[firstClub.club_id] ?? [];
      const firstSection = firstSections[0];
      if (firstSection) {
        initialSectionId = firstSection.club_section_id;
        try {
          initialOverview = await getSectionInsuranceOverview(
            firstSection.club_section_id,
          );
        } catch {
          initialOverview = null;
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && clubs.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title={t("page.empty_no_clubs_title")}
          description={t("page.empty_no_clubs_description")}
        />
      )}

      {!loadError && clubs.length > 0 && (
        <InsuranceView
          clubs={clubs}
          sectionsByClub={sectionsByClub}
          localFields={localFields}
          territoryScope={territoryScope}
          initialOverview={initialOverview}
          initialClubId={
            (initialLocalFieldId === "all"
              ? clubs[0]
              : clubs.find((club) => club.local_field_id === initialLocalFieldId))?.club_id ??
            clubs[0]?.club_id ??
            null
          }
          initialSectionId={initialSectionId}
          initialLocalFieldId={initialLocalFieldId}
        />
      )}
    </div>
  );
}
