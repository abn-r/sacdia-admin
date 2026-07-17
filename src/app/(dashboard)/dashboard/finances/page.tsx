import { DollarSign } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { FinancesClubSelector } from "@/components/finances/finances-club-selector";
import { apiRequest, ApiError } from "@/lib/api/client";
import { listClubTypes } from "@/lib/api/catalogs";
import { requireAdminUser } from "@/lib/auth/session";
import {
  canAdminFilterByLocalField,
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import {
  normalizeFinanceClubSections,
  type FinanceClubSection,
} from "@/lib/finances/club-sections";
import type { LocalField } from "@/lib/api/geography";
import type { ClubType } from "@/lib/api/catalogs";

type AnyRecord = Record<string, unknown>;

type ClubOption = {
  club_id: number;
  name: string;
  sections: FinanceClubSection[];
  local_field_id?: number;
};

type FetchClubsError =
  | { kind: "api"; message: string }
  | { kind: "unexpected" };

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

async function fetchClubs(
  clubTypes: ClubType[],
): Promise<{ clubs: ClubOption[]; fetchError?: FetchClubsError }> {
  try {
    const payload = await apiRequest<unknown>("/clubs");
    const raw = extractArray(payload);

    const clubs: ClubOption[] = raw
      .filter((club) => club.active !== false)
      .map((club) => {
        const localFieldId = Number(club.local_field_id ?? 0);
        return {
          club_id: Number(club.club_id ?? club.id),
          name: String(club.name ?? `Club ${club.club_id ?? club.id}`),
          sections: normalizeFinanceClubSections(club, clubTypes),
          local_field_id: localFieldId > 0 ? localFieldId : undefined,
        };
      })
      .filter((club) => club.club_id > 0);

    return { clubs };
  } catch (error) {
    if (error instanceof ApiError) {
      return { clubs: [], fetchError: { kind: "api", message: error.message } };
    }
    return { clubs: [], fetchError: { kind: "unexpected" } };
  }
}

export default async function FinancesPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("finances");
  const territoryScope = resolveAdminTerritoryScope(user);

  const clubTypes = await listClubTypes().catch(() => []);
  const { clubs, fetchError } = await fetchClubs(clubTypes);
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
