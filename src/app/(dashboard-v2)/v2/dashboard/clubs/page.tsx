import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { ClubsListClient } from "@/components/clubs/clubs-list-client";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { loadClubsList } from "@/lib/v2/loaders/clubs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("clubs.pages.list");
  return { title: `${t("title")} · v2` };
}

export default async function V2ClubsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("clubs.pages.list");
  const raw = await searchParams;
  const {
    result,
    localFieldOptions,
    canCreate,
    canEdit,
    pendingCountsByClubId,
  } = await loadClubsList(raw, user);

  if (!result.available) {
    return (
      <V2PageShell title={t("title")} description={t("description")} bleed>
        <EndpointErrorBanner
          state="missing"
          detail={
            result.error === "UNEXPECTED"
              ? t("unexpectedError")
              : (result.error ?? t("endpointError"))
          }
        />
        <EmptyState
          icon={Building2}
          title={t("cannotShow")}
          description={
            result.error === "UNEXPECTED" ? t("unexpectedError") : result.error
          }
        />
      </V2PageShell>
    );
  }

  return (
    <V2PageShell title={t("title")} description={t("description")} bleed>
      <ClubsListClient
        items={result.items}
        meta={result.meta}
        localFieldOptions={localFieldOptions}
        canCreate={canCreate}
        canEdit={canEdit}
        pendingCountsByClubId={pendingCountsByClubId}
      />
    </V2PageShell>
  );
}
