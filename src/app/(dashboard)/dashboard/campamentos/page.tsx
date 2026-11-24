import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { UrlTabs } from "@/components/shared/url-tabs";
import { CamporeesList } from "@/components/camporees/camporees-list";
import { apiRequest } from "@/lib/api/client";
import type { Camporee, UnionCamporee } from "@/lib/api/camporees";
import { errorStateFromError } from "@/lib/api/error-state";
import { camporeeScreenId, canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { SACDIA_DISPLAY_TIMEZONE } from "@/lib/format-locale";
import {
  countOpenRegistration,
  toLocalListRow,
  toUnionListRow,
  type CamporeeListRow,
} from "@/lib/camporees/list";
import { extractPagedList } from "@/lib/camporees/normalize";
import type { CamporeeKind } from "@/lib/camporees/normalize";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readPositiveInt(value: string | string[] | undefined, fallback: number): number {
  const raw = typeof value === "string" ? value : undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

function todayInDisplayZone(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: SACDIA_DISPLAY_TIMEZONE });
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporees.pages.list");
  return { title: t("title") };
}

async function loadPage(kind: CamporeeKind, page: number, limit: number) {
  const path = kind === "union" ? "/camporees/union" : "/camporees";
  try {
    const payload = await apiRequest<unknown>(path, { params: { page, limit } });
    return { ok: true as const, paged: extractPagedList<Camporee | UnionCamporee>(payload) };
  } catch (error) {
    return { ok: false as const, failure: errorStateFromError(error) };
  }
}

export default async function CamporeesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAdminUser();
  const t = await getTranslations("evaluation.camporees.list");
  const tl = await getTranslations("camporees.pages.list");

  const canLocal = canViewScreen(user, camporeeScreenId("local"));
  const canUnion = canViewScreen(user, camporeeScreenId("union"));
  if (!canLocal && !canUnion) return <PageAccessForbidden title={tl("title")} />;

  const sp = await searchParams;
  const requested = sp.tab === "union" ? "union" : "local";
  const kind: CamporeeKind =
    requested === "union" ? (canUnion ? "union" : "local") : canLocal ? "local" : "union";
  const defaultKind: CamporeeKind = canLocal ? "local" : "union";
  const other: CamporeeKind = kind === "union" ? "local" : "union";
  const canOther = other === "union" ? canUnion : canLocal;

  const page = readPositiveInt(sp.page, 1);
  const limit = readPositiveInt(sp.limit, 20);

  // The other tab only needs its total for the tab count.
  const [current, otherResult] = await Promise.all([
    loadPage(kind, page, limit),
    canOther ? loadPage(other, 1, 1) : Promise.resolve(null),
  ]);

  const rows: CamporeeListRow[] = current.ok
    ? current.paged.rows.map((row) =>
        kind === "union" ? toUnionListRow(row as UnionCamporee) : toLocalListRow(row as Camporee),
      )
    : [];
  const currentTotal = current.ok ? current.paged.total : null;
  const otherTotal = otherResult?.ok ? otherResult.paged.total : undefined;
  const countOf = (k: CamporeeKind) => (k === kind ? (currentTotal ?? undefined) : otherTotal);

  const tabs = [
    ...(canLocal
      ? [
          {
            value: "local",
            label: t("tabLocal"),
            count: countOf("local"),
            href: "/dashboard/campamentos",
          },
        ]
      : []),
    ...(canUnion
      ? [
          {
            value: "union",
            label: t("tabUnion"),
            count: countOf("union"),
            href: "/dashboard/campamentos?tab=union",
          },
        ]
      : []),
  ];

  const canCreate = canCapability(user, camporeeScreenId(kind), "create");
  const canEdit = canCapability(user, camporeeScreenId(kind), "update");
  const canDelete = canCapability(user, camporeeScreenId(kind), "delete");
  const canTemplates = canViewScreen(user, "campamentos-plantillas");

  let description: string | undefined;
  if (current.ok) {
    const single = current.paged.totalPages <= 1;
    if (single) {
      const open = countOpenRegistration(rows);
      description = open > 0 ? t("finding", { open }) : t("findingNoneOpen");
    } else {
      description = t("findingTotal", { total: current.paged.total });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tl("title")}
        description={description}
        actions={
          <>
            {canTemplates && (
              <Button variant="outline" asChild>
                <Link href="/dashboard/campamentos/plantillas">{t("templates")}</Link>
              </Button>
            )}
            {canCreate && (
              <Button asChild>
                <Link
                  href={
                    kind === "union"
                      ? "/dashboard/campamentos/new?kind=union"
                      : "/dashboard/campamentos/new"
                  }
                >
                  <Plus className="size-4" />
                  {kind === "union" ? t("newUnion") : t("newLocal")}
                </Link>
              </Button>
            )}
          </>
        }
      />

      {tabs.length > 1 && (
        <UrlTabs tabs={tabs} defaultValue={defaultKind} ariaLabel={t("tabsLabel")} />
      )}

      <CamporeesList
        kind={kind}
        rows={rows}
        failure={current.ok ? null : current.failure}
        pagination={{
          page: current.ok ? current.paged.page : page,
          totalPages: current.ok ? current.paged.totalPages : 1,
          total: current.ok ? current.paged.total : 0,
          limit: current.ok ? current.paged.limit : limit,
        }}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        today={todayInDisplayZone()}
      />
    </div>
  );
}
