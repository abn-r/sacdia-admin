import { DollarSign } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { FinancesClubSelector } from "@/components/finances/finances-club-selector";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import {
  canAdminFilterByLocalField,
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { LocalField } from "@/lib/api/geography";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClubSection = {
  club_section_id: number;
  club_type_id: number;
  name: string;
  club_type?: { name?: string; slug?: string } | null;
};

type Club = {
  club_id?: number;
  id?: number;
  name?: string;
  active?: boolean;
  sections?: ClubSection[];
  [key: string]: unknown;
};

type ClubOption = {
  club_id: number;
  name: string;
  sections: ClubSection[];
  local_field_id?: number;
};

// ─── Data fetching ────────────────────────────────────────────────────────────

type FetchClubsError =
  | { kind: "api"; message: string }
  | { kind: "unexpected" };

async function fetchClubs(): Promise<{ clubs: ClubOption[]; fetchError?: FetchClubsError }> {
  try {
    const payload = await apiRequest<unknown>("/clubs");
    let raw: Club[] = [];

    if (Array.isArray(payload)) {
      raw = payload as Club[];
    } else if (payload && typeof payload === "object") {
      const res = payload as { data?: unknown };
      if (Array.isArray(res.data)) {
        raw = res.data as Club[];
      }
    }

    const clubs: ClubOption[] = raw
      .filter((c) => c.active !== false)
      .map((c) => {
        const localFieldId = Number(c.local_field_id ?? 0);
        return {
          club_id: Number(c.club_id ?? c.id),
          name: c.name ?? `Club ${c.club_id ?? c.id}`,
          sections: Array.isArray(c.sections) ? c.sections : [],
          local_field_id: localFieldId > 0 ? localFieldId : undefined,
        };
      })
      .filter((c) => c.club_id > 0);

    return { clubs };
  } catch (error) {
    if (error instanceof ApiError) {
      return { clubs: [], fetchError: { kind: "api", message: error.message } };
    }
    return { clubs: [], fetchError: { kind: "unexpected" } };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FinancesPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("finances");
  const territoryScope = resolveAdminTerritoryScope(user);

  const { clubs, fetchError } = await fetchClubs();
  let localFields: LocalField[] = [];

  if (canAdminFilterByLocalField(territoryScope)) {
    localFields = await listLocalFieldsForTerritory(user).catch(() => []);
  }

  const errorMessage = fetchError
    ? fetchError.kind === "api"
      ? fetchError.message
      : t("page.error_unexpected")
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      {errorMessage && (
        <EndpointErrorBanner
          state="missing"
          detail={errorMessage}
        />
      )}

      {!errorMessage && clubs.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title={t("page.empty_no_clubs_title")}
          description={t("page.empty_no_clubs_description")}
        />
      ) : (
        <FinancesClubSelector
          clubs={clubs}
          localFields={localFields}
          territoryScope={territoryScope}
        />
      )}
    </div>
  );
}
