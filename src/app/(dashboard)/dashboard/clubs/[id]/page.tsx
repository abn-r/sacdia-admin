import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EditClubForm } from "@/components/clubs/edit-club-form";
import { ClubSectionsPanel } from "@/components/clubs/club-sections-panel";
import { apiRequest, ApiError } from "@/lib/api/client";

const PendingMembersPanel = dynamic(
  () =>
    import("@/components/membership/pending-members-panel").then((m) => ({
      default: m.PendingMembersPanel,
    })),
  {
    loading: () => (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-md border p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    ),
  }
);

const UnitsTab = dynamic(
  () =>
    import("@/components/units/units-tab").then((m) => ({
      default: m.UnitsTab,
    })),
  {
    loading: () => (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    ),
  }
);
import { requireAdminUser } from "@/lib/auth/session";
import { getSelectOptions } from "@/lib/catalogs/service";
import { updateClubAction, deleteClubAction } from "@/lib/clubs/actions";
import type { ClubActionState } from "@/lib/clubs/actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ tab?: string }>;

type Club = {
  club_id?: number;
  id?: number;
  name?: string;
  description?: string | null;
  active?: boolean;
  local_field_id?: number;
  district_id?: number;
  church_id?: number;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coordinates?: { lat?: number; lng?: number } | null;
  local_field?: { name?: string } | null;
  district?: { name?: string } | null;
  church?: { name?: string } | null;
  sections?: Array<{
    club_section_id?: number;
    club_type_id?: number;
    club_type?: { name?: string } | null;
    name?: string;
    active?: boolean;
    souls_target?: number | null;
    fee?: number | null;
    members_count?: number;
  }>;
  [key: string]: unknown;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-[160px] text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

function ClubViewCard({ club, labels }: { club: Club; labels: {
  infoCardTitle: string; labelName: string; labelDescription: string; labelStatus: string;
  labelLocalField: string; labelDistrict: string; labelChurch: string; labelAddress: string;
  labelCoordinates: string; statusActive: string; statusInactive: string;
} }) {
  const lat = (club.coordinates as { lat?: number } | null)?.lat ?? club.latitude;
  const lng = (club.coordinates as { lng?: number } | null)?.lng ?? club.longitude;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{labels.infoCardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label={labels.labelName} value={club.name} />
          <InfoRow label={labels.labelDescription} value={club.description} />
          <InfoRow
            label={labels.labelStatus}
            value={
              <Badge variant={club.active !== false ? "soft-success" : "outline"}>
                {club.active !== false ? labels.statusActive : labels.statusInactive}
              </Badge>
            }
          />
          <InfoRow label={labels.labelLocalField} value={club.local_field?.name} />
          <InfoRow label={labels.labelDistrict} value={club.district?.name} />
          <InfoRow label={labels.labelChurch} value={club.church?.name} />
          <InfoRow label={labels.labelAddress} value={club.address} />
          {(lat != null || lng != null) && (
            <InfoRow label={labels.labelCoordinates} value={`${lat ?? "—"}, ${lng ?? "—"}`} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const VALID_TABS = ["view", "edit", "sections", "units", "membership"] as const;
type ValidTab = (typeof VALID_TABS)[number];

function resolveTab(raw: string | undefined): ValidTab {
  if (raw && (VALID_TABS as readonly string[]).includes(raw)) {
    return raw as ValidTab;
  }
  return "view";
}

export default async function ClubDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdminUser();
  const t = await getTranslations("clubs.pages.detail");
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const defaultTab = resolveTab(tabParam);

  let club: Club;
  try {
    const payload = await apiRequest<unknown>(`/clubs/${id}`);
    const res = payload as { data?: Club; status?: string } | Club;
    club = ("data" in res && res.data && typeof res.data === "object" ? res.data : res) as Club;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const clubId = Number(club.club_id ?? club.id ?? id);
  const clubName = club.name ?? "Club";
  const sections = club.sections ?? [];

  const [localFields, districts, churches] = await Promise.all([
    getSelectOptions("local-fields").catch(() => []),
    getSelectOptions("districts").catch(() => []),
    getSelectOptions("churches").catch(() => []),
  ]);

  const boundUpdateAction = updateClubAction.bind(null, clubId);

  return (
    <div className="space-y-6">
      <PageHeader title={clubName}>
        <div className="flex gap-2">
          <form action={deleteClubAction}>
            <input type="hidden" name="id" value={clubId} />
            <Button variant="destructive" size="sm" type="submit">
              {t("deleteButton")}
            </Button>
          </form>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/clubs">
              <ArrowLeft className="size-4" />
              {t("back")}
            </Link>
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="view">{t("tabView")}</TabsTrigger>
          <TabsTrigger value="edit">{t("tabEdit")}</TabsTrigger>
          <TabsTrigger value="sections">{t("tabSections", { count: sections.length })}</TabsTrigger>
          <TabsTrigger value="units">{t("tabUnits")}</TabsTrigger>
          <TabsTrigger value="membership">{t("tabMembership")}</TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="mt-4">
          <ClubViewCard club={club} labels={{
            infoCardTitle: t("infoCardTitle"),
            labelName: t("labelName"),
            labelDescription: t("labelDescription"),
            labelStatus: t("labelStatus"),
            labelLocalField: t("labelLocalField"),
            labelDistrict: t("labelDistrict"),
            labelChurch: t("labelChurch"),
            labelAddress: t("labelAddress"),
            labelCoordinates: t("labelCoordinates"),
            statusActive: t("statusActive"),
            statusInactive: t("statusInactive"),
          }} />
        </TabsContent>

        <TabsContent value="edit" className="mt-4">
          <EditClubForm
            club={club}
            localFields={localFields}
            districts={districts}
            churches={churches}
            formAction={boundUpdateAction}
          />
        </TabsContent>

        <TabsContent value="sections" className="mt-4 space-y-4">
          <ClubSectionsPanel clubId={clubId} sections={sections} />
        </TabsContent>

        <TabsContent value="units" className="mt-4">
          <UnitsTab clubId={clubId} localFieldId={club.local_field_id ?? null} />
        </TabsContent>

        <TabsContent value="membership" className="mt-4 space-y-4">
          <PendingMembersPanel sections={sections} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
