import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ClubContextBar, ClubPickList, SectionPickLinks } from "@/components/shared/club-context-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { InventoryView } from "@/components/inventory/inventory-view";
import { listClubTypes } from "@/lib/api/catalogs";
import { errorStateFromError } from "@/lib/api/error-state";
import type { LocalField } from "@/lib/api/geography";
import { listClubInventory, listInventoryCategories } from "@/lib/api/inventory";
import type { InventoryItem } from "@/lib/api/inventory";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  canAdminFilterByLocalField,
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import { loadClubContextClubs } from "@/lib/club-context/load-clubs";
import { CLUB_CONTEXT_COOKIE, resolveClubContext } from "@/lib/club-context/scope";
import { normalizeInventoryCategories } from "@/lib/inventory/categories";
import { clubTypeIdToInstanceType, extractArray } from "@/lib/inventory/club-sections";
import { countNeedingAttention } from "@/lib/inventory/filter-items";
import { normalizeInventoryItem } from "@/lib/inventory/normalize-item";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inventory");
  return { title: t("page.title") };
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string | string[]; section?: string | string[] }>;
}) {
  const user = await requireAdminUser();
  if (!canViewScreen(user, "club-inventory")) {
    redirect("/dashboard");
  }
  const t = await getTranslations("inventory");
  const tc = await getTranslations("ops.club.inventory");
  const search = await searchParams;
  const cookieStore = await cookies();
  const territoryScope = resolveAdminTerritoryScope(user);

  const [clubTypes, localFields] = await Promise.all([
    listClubTypes().catch(() => []),
    canAdminFilterByLocalField(territoryScope)
      ? listLocalFieldsForTerritory(user).catch((): LocalField[] => [])
      : Promise.resolve<LocalField[]>([]),
  ]);
  const loaded = await loadClubContextClubs(clubTypes, localFields);

  if (!loaded.ok) {
    const { kind, detail } = errorStateFromError(loaded.error);
    return (
      <div className="space-y-6">
        <PageHeader title={t("page.title")} />
        <ErrorState kind={kind} detail={detail} retry />
      </div>
    );
  }

  const clubs = loaded.clubs;
  if (clubs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("page.title")} />
        <EmptyState
          icon={Package}
          title={t("page.empty_no_clubs_title")}
          description={t("page.empty_no_clubs_description")}
        />
      </div>
    );
  }

  const { club, section } = resolveClubContext({
    clubs,
    searchParams: search,
    cookie: cookieStore.get(CLUB_CONTEXT_COOKIE)?.value ?? null,
  });
  // Club roles have one club: they go straight to it, with nothing to pick.
  const fixed = clubs.length === 1;
  const bar = (
    <ClubContextBar
      clubs={clubs}
      clubId={club?.club_id ?? null}
      sectionId={section?.club_section_id ?? null}
      fixed={fixed && club?.sections.length === 1}
    />
  );

  // No section yet: the territory's clubs (or the sections of the chosen club), never an empty page.
  if (!club || !section) {
    return (
      <div className="space-y-6">
        {bar}
        <PageHeader title={t("page.title")} description={t("page.description")} />
        {club ? (
          <EmptyState
            icon={Package}
            title={tc("pickSection.title", { club: club.name })}
            description={tc("pickSection.description")}
          >
            <SectionPickLinks club={club} />
          </EmptyState>
        ) : (
          <ClubPickList clubs={clubs} />
        )}
      </div>
    );
  }

  const instanceType = clubTypeIdToInstanceType(section.club_type_id);
  const [itemsResult, categoriesResult] = await Promise.allSettled([
    listClubInventory(section.club_section_id, { instanceType }),
    listInventoryCategories(),
  ]);

  const contextQuery = new URLSearchParams({
    club: String(club.club_id),
    section: String(section.club_section_id),
  }).toString();
  const canCreate = canCapability(user, "club-inventory", "create");

  if (itemsResult.status === "rejected") {
    const { kind, detail } = errorStateFromError(itemsResult.reason);
    return (
      <div className="space-y-6">
        {bar}
        <PageHeader title={t("page.title")} description={t("page.description")} />
        <ErrorState kind={kind} detail={detail} description={t("errors.load_items_failed")} retry />
      </div>
    );
  }

  const items: InventoryItem[] = extractArray(itemsResult.value).map(normalizeInventoryItem);
  const categories =
    categoriesResult.status === "fulfilled" ? normalizeInventoryCategories(categoriesResult.value) : [];
  const attention = countNeedingAttention(items);

  return (
    <div className="space-y-6">
      {bar}
      <PageHeader
        title={t("page.title")}
        description={tc("description", { count: items.length, attention })}
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href={`/dashboard/inventory/new?${contextQuery}`}>
                <Plus className="size-4" aria-hidden />
                {t("view.new_item")}
              </Link>
            </Button>
          ) : null
        }
      />
      <InventoryView key={section.club_section_id} items={items} categories={categories} contextQuery={contextQuery} />
    </div>
  );
}
