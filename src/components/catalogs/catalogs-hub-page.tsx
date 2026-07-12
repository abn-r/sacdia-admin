import {
  Globe,
  Building2,
  MapPin,
  Church,
  Map,
  Heart,
  Stethoscope,
  Pill,
  Users,
  CalendarDays,
  Tent,
  Shield,
  Award,
  BookOpen,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import {
  CatalogHubGrid,
  type CatalogHubCard,
} from "@/components/catalogs/catalog-hub-grid";

type CatalogsHubPageProps = {
  hidePageHeader?: boolean;
};

export async function CatalogsHubPage({ hidePageHeader = false }: CatalogsHubPageProps) {
  await requireAdminUser();
  const t = await getTranslations("catalogs.pages.root");

  const geographyCards: CatalogHubCard[] = [
    {
      title: t("cardCountries"),
      description: t("cardCountriesDesc"),
      href: "/dashboard/catalogs/geography/countries",
      icon: Globe,
      colorClass:
        "bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)] text-[var(--chart-2)]",
    },
    {
      title: t("cardUnions"),
      description: t("cardUnionsDesc"),
      href: "/dashboard/catalogs/geography/unions",
      icon: Building2,
      colorClass:
        "bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)] text-[var(--chart-2)]",
    },
    {
      title: t("cardLocalFields"),
      description: t("cardLocalFieldsDesc"),
      href: "/dashboard/catalogs/geography/local-fields",
      icon: MapPin,
      colorClass:
        "bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)] text-[var(--chart-2)]",
    },
    {
      title: t("cardDistricts"),
      description: t("cardDistrictsDesc"),
      href: "/dashboard/catalogs/geography/districts",
      icon: Map,
      colorClass:
        "bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)] text-[var(--chart-2)]",
    },
    {
      title: t("cardChurches"),
      description: t("cardChurchesDesc"),
      href: "/dashboard/catalogs/geography/churches",
      icon: Church,
      colorClass:
        "bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)] text-[var(--chart-2)]",
    },
  ];

  const referenceCards: CatalogHubCard[] = [
    {
      title: t("cardAllergies"),
      description: t("cardAllergiesDesc"),
      href: "/dashboard/catalogs/allergies",
      icon: Heart,
      colorClass:
        "bg-[color-mix(in_oklch,var(--chart-4)_12%,transparent)] text-[var(--chart-4)]",
    },
    {
      title: t("cardDiseases"),
      description: t("cardDiseasesDesc"),
      href: "/dashboard/catalogs/diseases",
      icon: Stethoscope,
      colorClass:
        "bg-[color-mix(in_oklch,var(--chart-4)_12%,transparent)] text-[var(--chart-4)]",
    },
    {
      title: t("cardMedicines"),
      description: t("cardMedicinesDesc"),
      href: "/dashboard/catalogs/medicines",
      icon: Pill,
      colorClass:
        "bg-[color-mix(in_oklch,var(--chart-4)_12%,transparent)] text-[var(--chart-4)]",
    },
    {
      title: t("cardRelationshipTypes"),
      description: t("cardRelationshipTypesDesc"),
      href: "/dashboard/catalogs/relationship-types",
      icon: Users,
      colorClass:
        "bg-[color-mix(in_oklch,var(--chart-3)_14%,transparent)] text-[var(--chart-3)]",
    },
    {
      title: t("cardEcclesiasticalYears"),
      description: t("cardEcclesiasticalYearsDesc"),
      href: "/dashboard/catalogs/ecclesiastical-years",
      icon: CalendarDays,
      colorClass:
        "bg-[color-mix(in_oklch,var(--chart-3)_14%,transparent)] text-[var(--chart-3)]",
    },
    {
      title: t("cardClubTypes"),
      description: t("cardClubTypesDesc"),
      href: "/dashboard/catalogs/club-types",
      icon: Tent,
      colorClass:
        "bg-[color-mix(in_oklch,var(--chart-3)_14%,transparent)] text-[var(--chart-3)]",
      readOnly: true,
    },
    {
      title: t("cardClubIdeals"),
      description: t("cardClubIdealsDesc"),
      href: "/dashboard/catalogs/club-ideals",
      icon: Shield,
      colorClass:
        "bg-[color-mix(in_oklch,var(--chart-3)_14%,transparent)] text-[var(--chart-3)]",
      readOnly: true,
    },
    {
      title: t("cardHonorCategories"),
      description: t("cardHonorCategoriesDesc"),
      href: "/dashboard/catalogs/honor-categories",
      icon: Award,
      colorClass: "bg-primary/10 text-primary",
    },
  ];

  return (
    <div className="space-y-8">
      {!hidePageHeader ? (
        <PageHeader title={t("title")} description={t("description")} />
      ) : null}
      <CatalogHubGrid
        sectionTitle={t("sectionGeography")}
        sectionIcon={Globe}
        cards={geographyCards}
        readOnlyLabel={t("readOnly")}
      />
      <CatalogHubGrid
        sectionTitle={t("sectionReference")}
        sectionIcon={BookOpen}
        cards={referenceCards}
        readOnlyLabel={t("readOnly")}
      />
    </div>
  );
}
