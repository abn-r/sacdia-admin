import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ActivitiesCalendarClient } from "@/components/activities/activities-calendar-client";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ApiError, apiRequest } from "@/lib/api/client";
import { listActivities } from "@/lib/api/activities";
import { listAdminLocalFields } from "@/lib/api/admin-local-fields";
import {
  extractArray,
  normalizeActivities,
} from "@/lib/activities/helpers";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  ACTIVITIES_CREATE,
  ACTIVITIES_READ,
  ACTIVITIES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import {
  readPositiveNumberParam,
} from "@/lib/phase-e-catalogs/fetch-helpers";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type ClubOption = {
  club_id: number;
  name: string;
  local_field_id?: number;
};

type SectionOption = {
  club_section_id: number;
  name: string;
  club_type_id: number;
};

function normalizeClub(raw: Record<string, unknown>): ClubOption {
  return {
    club_id: Number(raw.club_id ?? raw.id ?? 0),
    name: String(raw.name ?? `Club ${raw.club_id ?? "?"}`),
    local_field_id:
      typeof raw.local_field_id === "number" ? raw.local_field_id : undefined,
  };
}

function normalizeSection(raw: Record<string, unknown>): SectionOption {
  const clubTypes = raw.club_types as Record<string, unknown> | undefined;
  const clubTypeName =
    typeof clubTypes?.name === "string" ? clubTypes.name : null;

  return {
    club_section_id: Number(raw.club_section_id ?? raw.id ?? 0),
    name: String(
      raw.name ?? clubTypeName ?? `Sección ${raw.club_section_id ?? "?"}`,
    ),
    club_type_id: Number(raw.club_type_id ?? clubTypes?.club_type_id ?? 0),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("activities.page");
  return { title: t("title") };
}

export default async function ClubActivitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("activities.page");
  const raw = await searchParams;

  if (!hasAnyPermission(user, [ACTIVITIES_READ])) {
    return (
      <EndpointErrorBanner
        state="missing"
        detail={t("error_load_clubs")}
      />
    );
  }

  const localFieldId = readPositiveNumberParam(raw, "localFieldId");
  const clubId = readPositiveNumberParam(raw, "clubId");
  const sectionId = readPositiveNumberParam(raw, "sectionId");
  const canCreate = hasAnyPermission(user, [ACTIVITIES_CREATE]);
  const canEdit = hasAnyPermission(user, [ACTIVITIES_UPDATE]);

  let clubs: ClubOption[] = [];
  let sectionsByClub: Record<number, SectionOption[]> = {};
  let initialActivities: ReturnType<typeof normalizeActivities> = [];
  let loadError: string | null = null;

  const localFields = await listAdminLocalFields().catch(() => []);
  const localFieldOptions = localFields.map((localField) => ({
    label: localField.name,
    value: localField.local_field_id,
  }));

  try {
    const clubsPayload = await apiRequest<unknown>("/clubs", {
      params: {
        limit: 200,
        active: true,
        ...(localFieldId ? { localFieldId } : {}),
      },
    });
    clubs = extractArray(clubsPayload)
      .map((item) => normalizeClub(item as Record<string, unknown>))
      .filter((club) => club.club_id > 0);
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : t("error_load_clubs");
  }

  if (!loadError && clubs.length > 0) {
    const sectionResults = await Promise.all(
      clubs.map(async (club) => {
        try {
          const payload = await apiRequest<unknown>(`/clubs/${club.club_id}/sections`);
          return {
            clubId: club.club_id,
            sections: extractArray(payload)
              .filter(
                (raw) => (raw as Record<string, unknown>).active !== false,
              )
              .map((item) => normalizeSection(item as Record<string, unknown>))
              .filter((section) => section.club_section_id > 0),
          };
        } catch {
          return { clubId: club.club_id, sections: [] as SectionOption[] };
        }
      }),
    );
    sectionsByClub = Object.fromEntries(
      sectionResults.map(({ clubId: id, sections }) => [id, sections]),
    );

    const targetClub =
      clubId != null
        ? clubs.find((club) => club.club_id === clubId)
        : clubs[0];

    if (targetClub) {
      try {
        const targetSection = sectionId
          ? sectionsByClub[targetClub.club_id]?.find(
              (section) => section.club_section_id === sectionId,
            )
          : null;
        const activitiesPayload = await listActivities(targetClub.club_id, {
          page: 1,
          limit: 200,
          active: true,
          ...(targetSection ? { clubTypeId: targetSection.club_type_id } : {}),
        });
        let activities = normalizeActivities(activitiesPayload, targetClub.name);
        if (targetSection) {
          activities = activities.filter(
            (activity) => activity.club_section_id === targetSection.club_section_id,
          );
        }
        initialActivities = activities;
      } catch {
        initialActivities = [];
      }
    }
  }

  if (loadError) {
    return <EndpointErrorBanner state="missing" detail={loadError} />;
  }

  return (
    <ActivitiesCalendarClient
      localFieldOptions={localFieldOptions}
      initialClubs={clubs}
      initialSectionsByClub={sectionsByClub}
      initialActivities={initialActivities}
      initialLocalFieldId={localFieldId ?? null}
      initialClubId={clubId ?? clubs[0]?.club_id ?? null}
      initialSectionId={sectionId ?? null}
      canCreate={canCreate}
      canEdit={canEdit}
    />
  );
}
