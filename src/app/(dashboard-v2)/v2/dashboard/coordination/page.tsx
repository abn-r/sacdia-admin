import { Network } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CoordinationAdminClient } from "@/components/coordination/coordination-admin-client";
import { apiRequest } from "@/lib/api/client";
import { listAdminUsers } from "@/lib/api/admin-users";
import { listClubTypes, type ClubType } from "@/lib/api/catalogs";
import { listDistricts, listLocalFields, type LocalField } from "@/lib/api/geography";
import {
  listCoordinationZones,
  listCoordinatorAssignments,
} from "@/lib/api/coordination";
import { COORDINATION_MANAGE } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permission-utils";
import { requireAdminUser } from "@/lib/auth/session";
import { resolveUserLocalField } from "@/lib/auth/user-local-field";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type RawClubSection = {
  club_section_id: number;
  name?: string | null;
  active?: boolean;
  club_type_id?: number | null;
  club_types?: { club_type_id?: number; name?: string | null } | null;
};

type RawClub = {
  club_id?: number;
  id?: number;
  name?: string | null;
  club_sections?: RawClubSection[];
};

type ClubSectionOption = {
  club_section_id: number;
  name?: string | null;
  active?: boolean;
  club_id: number;
  club_name: string;
  club_type_id?: number | null;
  club_type_name?: string | null;
};

function getRequestedLocalFieldId(raw: Record<string, string | string[] | undefined>) {
  const value = raw.localFieldId;
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

async function safeListLocalFields() {
  try {
    return await listLocalFields();
  } catch {
    return [] as LocalField[];
  }
}

async function safeListDistricts(localFieldId: number) {
  try {
    return await listDistricts(localFieldId);
  } catch {
    return [];
  }
}

async function safeListClubTypes() {
  try {
    return await listClubTypes();
  } catch {
    return [] as ClubType[];
  }
}

async function safeListCoordinatorUsers(localFieldId: number) {
  try {
    const result = await listAdminUsers({ localFieldId, active: true, limit: 100 });
    const coordinatorRoles = new Set([
      "coordinator",
      "zone-coordinator",
      "general-coordinator",
    ]);
    return result.items.filter((user) =>
      (user.roles ?? []).some((role) => coordinatorRoles.has(role.toLowerCase())),
    );
  } catch {
    return [];
  }
}

function unwrapClubs(payload: unknown): RawClub[] {
  if (Array.isArray(payload)) return payload as RawClub[];
  if (payload && typeof payload === "object") {
    const record = payload as { data?: unknown };
    if (Array.isArray(record.data)) return record.data as RawClub[];
  }
  return [];
}

async function safeListClubSections(localFieldId: number): Promise<ClubSectionOption[]> {
  try {
    const payload = await apiRequest<unknown>("/clubs", {
      params: { localFieldId, limit: 500, page: 1, active: true },
    });
    return unwrapClubs(payload).flatMap((club) => {
      const clubId = club.club_id ?? club.id;
      if (!clubId) return [];
      const clubName = club.name ?? `Club ${clubId}`;
      return (club.club_sections ?? [])
        .filter((section) => section.active !== false)
        .map((section) => ({
          club_section_id: section.club_section_id,
          name: section.name,
          active: section.active,
          club_id: clubId,
          club_name: clubName,
          club_type_id: section.club_type_id ?? section.club_types?.club_type_id ?? null,
          club_type_name: section.club_types?.name ?? null,
        }));
    });
  } catch {
    return [];
  }
}

export default async function CoordinationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  if (!hasPermission(user, COORDINATION_MANAGE)) {
    notFound();
  }

  const t = await getTranslations("coordinationAdmin");
  const rawParams = await searchParams;
  const userLocalFieldScope = resolveUserLocalField(user);
  const localFields = await safeListLocalFields();

  const requestedLocalFieldId = getRequestedLocalFieldId(rawParams);
  const selectedLocalFieldId =
    userLocalFieldScope.scope === "single"
      ? userLocalFieldScope.localFieldId
      : requestedLocalFieldId ?? localFields[0]?.local_field_id ?? null;

  if (!selectedLocalFieldId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("page.title")}
          description={t("page.description")}
        />
        <EmptyState
          icon={Network}
          title={t("emptyNoLocalField.title")}
          description={t("emptyNoLocalField.description")}
        />
      </div>
    );
  }

  const [zones, assignments, districts, clubTypes, coordinatorUsers, clubSections] =
    await Promise.all([
      listCoordinationZones(selectedLocalFieldId).catch(() => []),
      listCoordinatorAssignments(selectedLocalFieldId).catch(() => []),
      safeListDistricts(selectedLocalFieldId),
      safeListClubTypes(),
      safeListCoordinatorUsers(selectedLocalFieldId),
      safeListClubSections(selectedLocalFieldId),
    ]);

  const visibleLocalFields =
    userLocalFieldScope.scope === "single"
      ? localFields.filter(
          (localField) => localField.local_field_id === selectedLocalFieldId,
        )
      : localFields;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />
      <CoordinationAdminClient
        localFields={visibleLocalFields.length > 0 ? visibleLocalFields : localFields}
        selectedLocalFieldId={selectedLocalFieldId}
        zones={zones}
        assignments={assignments}
        districts={districts}
        clubTypes={clubTypes}
        coordinatorUsers={coordinatorUsers}
        clubSections={clubSections}
        canChangeLocalField={userLocalFieldScope.scope === "all"}
      />
    </div>
  );
}
