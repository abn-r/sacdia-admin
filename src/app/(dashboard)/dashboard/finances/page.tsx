import { DollarSign } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { FinancesClubSelector } from "@/components/finances/finances-club-selector";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

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
      .map((c) => ({
        club_id: Number(c.club_id ?? c.id),
        name: c.name ?? `Club ${c.club_id ?? c.id}`,
        sections: Array.isArray(c.sections) ? c.sections : [],
      }))
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
  await requireAdminUser();
  const t = await getTranslations("finances");

  const { clubs, fetchError } = await fetchClubs();

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
        <FinancesClubSelector clubs={clubs} />
      )}
    </div>
  );
}
