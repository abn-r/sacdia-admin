import {
  LayoutDashboard,
  Users,
  BookOpen,
  Building2,
  Tent,
  GraduationCap,
  Award,
  Calendar,
  DollarSign,
  Package,
  Shield,
  Bell,
  FolderOpen,
  ShieldCheck,
  Heart,
  Star,
  ClipboardList,
  ClipboardCheck,
  FileText,
  FolderArchive,
  ArrowRightLeft,
  Settings2,
  CalendarOff,
  LibraryBig,
  Activity,
  FileSearch,
  Trophy,
  Users2,
  Layers,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import {
  RANKINGS_READ,
  RANKING_WEIGHTS_READ,
  MEMBER_RANKINGS_READ_GLOBAL,
  MEMBER_RANKING_WEIGHTS_READ,
  SECTION_RANKINGS_READ_GLOBAL,
} from "@/lib/auth/permissions";

/**
 * `title` and `label` fields hold i18n keys — NOT user-facing strings.
 * Renderers (see `app-sidebar.tsx`) resolve them via next-intl
 * `useTranslations()` at render time so the sidebar re-renders on locale change.
 *
 * Key convention: `nav.sections.<id>` for group labels,
 * `nav.items.<id>` for entries. Translators edit `messages/<locale>.json`.
 */

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  permission?: string;
  children?: NavChild[];
};

export type NavChild = {
  title: string;
  url: string;
  permission?: string;
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};

export const navConfig: NavGroup[] = [
  // ─── Top-level (no group label) ──────────────────────────────────────────────
  {
    items: [
      {
        title: "items.dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard:view",
      },
      {
        title: "items.users",
        url: "/dashboard/users",
        icon: Users,
        permission: "users:read",
      },
    ],
  },

  // ─── Catálogos ───────────────────────────────────────────────────────────────
  {
    label: "sections.catalogs",
    items: [
      {
        title: "items.catalogs_root",
        url: "/dashboard/catalogs",
        icon: BookOpen,
        children: [
          { title: "sections.overview", url: "/dashboard/catalogs" },
          { title: "items.geography_countries", url: "/dashboard/catalogs/geography/countries", permission: "countries:read" },
          { title: "items.geography_unions", url: "/dashboard/catalogs/geography/unions", permission: "unions:read" },
          { title: "items.geography_local_fields", url: "/dashboard/catalogs/geography/local-fields", permission: "local_fields:read" },
          { title: "items.geography_districts", url: "/dashboard/catalogs/geography/districts", permission: "districts:read" },
          { title: "items.geography_churches", url: "/dashboard/catalogs/geography/churches", permission: "churches:read" },
          { title: "items.allergies", url: "/dashboard/catalogs/allergies", permission: "catalogs:read" },
          { title: "items.diseases", url: "/dashboard/catalogs/diseases", permission: "catalogs:read" },
          { title: "items.medicines", url: "/dashboard/catalogs/medicines", permission: "catalogs:read" },
          { title: "items.relationship_types", url: "/dashboard/catalogs/relationship-types", permission: "catalogs:read" },
          { title: "items.ecclesiastical_years", url: "/dashboard/catalogs/ecclesiastical-years", permission: "ecclesiastical_years:read" },
          { title: "items.club_types", url: "/dashboard/catalogs/club-types", permission: "catalogs:read" },
          { title: "items.club_ideals", url: "/dashboard/catalogs/club-ideals", permission: "catalogs:read" },
          { title: "items.honor_categories", url: "/dashboard/catalogs/honor-categories", permission: "honor_categories:read" },
          { title: "items.activity_types", url: "/dashboard/catalogs/activity-types", permission: "catalogs:read" },
          { title: "items.catalog_classes", url: "/dashboard/catalogs/classes", permission: "catalogs:read" },
          { title: "items.catalog_class_modules", url: "/dashboard/catalogs/class-modules", permission: "catalogs:read" },
          { title: "items.catalog_class_sections", url: "/dashboard/catalogs/class-sections", permission: "catalogs:read" },
          { title: "items.catalog_folders", url: "/dashboard/catalogs/catalog-folders", permission: "catalogs:read" },
          { title: "items.catalog_folder_modules", url: "/dashboard/catalogs/folder-modules", permission: "catalogs:read" },
          { title: "items.catalog_folder_sections", url: "/dashboard/catalogs/folder-sections", permission: "catalogs:read" },
          { title: "items.catalog_finance_categories", url: "/dashboard/catalogs/finance-categories", permission: "catalogs:read" },
          { title: "items.catalog_inventory_categories", url: "/dashboard/catalogs/inventory-categories", permission: "catalogs:read" },
          { title: "items.catalog_honors", url: "/dashboard/catalogs/honors-catalog", permission: "honors:read" },
          { title: "items.catalog_master_honors", url: "/dashboard/catalogs/master-honors", permission: "catalogs:read" },
        ],
      },
      {
        title: "items.resources",
        url: "/dashboard/resources",
        icon: LibraryBig,
        permission: "resources:read",
        children: [
          { title: "items.resources_all", url: "/dashboard/resources", permission: "resources:read" },
          { title: "items.resources_categories", url: "/dashboard/resources/categories", permission: "resource_categories:read" },
        ],
      },
    ],
  },

  // ─── Sistema ─────────────────────────────────────────────────────────────────
  {
    label: "sections.administration",
    items: [
      {
        title: "items.rbac",
        url: "/dashboard/rbac",
        icon: Shield,
        permission: "permissions:read",
        children: [
          { title: "items.rbac_permissions", url: "/dashboard/rbac/permissions", permission: "permissions:read" },
          { title: "items.rbac_roles", url: "/dashboard/rbac/roles", permission: "roles:read" },
        ],
      },
      {
        title: "items.configuration",
        url: "/dashboard/settings",
        icon: Settings2,
        permission: "permissions:read",
        children: [
          { title: "items.settings_system", url: "/dashboard/settings", permission: "permissions:read" },
          { title: "items.settings_scoring", url: "/dashboard/settings/scoring-categories", permission: "scoring_categories:read" },
        ],
      },
      {
        title: "items.jobs_queues",
        url: "/dashboard/system/jobs",
        icon: Activity,
        permission: "permissions:read",
      },
    ],
  },

  // ─── Gestión de Clubes ───────────────────────────────────────────────────────
  {
    label: "sections.clubs",
    items: [
      { title: "items.clubs", url: "/dashboard/clubs", icon: Building2, permission: "clubs:read" },
      {
        title: "items.camporees",
        url: "/dashboard/camporees",
        icon: Tent,
        permission: "camporees:read",
        children: [
          { title: "items.camporees_local", url: "/dashboard/camporees", permission: "camporees:read" },
          { title: "items.camporees_union", url: "/dashboard/camporees/union", permission: "camporees:read" },
        ],
      },
      { title: "items.classes", url: "/dashboard/classes", icon: GraduationCap, permission: "classes:read" },
      { title: "items.enrollments", url: "/dashboard/enrollments", icon: ClipboardList, permission: "classes:read" },
      { title: "items.honors", url: "/dashboard/honors", icon: Award, permission: "honors:read" },
      { title: "items.achievements", url: "/dashboard/achievements", icon: Trophy, permission: "achievements:manage" },
      { title: "items.activities", url: "/dashboard/activities", icon: Calendar, permission: "activities:read" },
      { title: "items.finances", url: "/dashboard/finances", icon: DollarSign, permission: "finances:read" },
      { title: "items.inventory", url: "/dashboard/inventory", icon: Package, permission: "inventory:read" },
      { title: "items.certifications", url: "/dashboard/certifications", icon: ShieldCheck, permission: "user_certifications:read" },
      {
        title: "items.insurance",
        url: "/dashboard/insurance",
        icon: Heart,
        permission: "insurance:read",
        children: [
          { title: "items.insurance_by_section", url: "/dashboard/insurance", permission: "insurance:read" },
          { title: "items.insurance_expiring", url: "/dashboard/insurance/expiring", permission: "insurance:read" },
        ],
      },
    ],
  },

  // ─── Validación e Investiduras ───────────────────────────────────────────────
  {
    label: "sections.validation",
    items: [
      {
        title: "items.validation",
        url: "/dashboard/validation",
        icon: ClipboardCheck,
        permission: "validation:read",
      },
      {
        title: "items.evidence_folders",
        url: "/dashboard/evidence-review",
        icon: FileSearch,
        permission: "investiture:read",
      },
      {
        title: "items.investiture",
        url: "/dashboard/investiture",
        icon: Star,
        permission: "investiture:read",
        children: [
          { title: "items.investiture_pending", url: "/dashboard/investiture", permission: "investiture:read" },
          { title: "items.investiture_pipeline", url: "/dashboard/investiture/pipeline", permission: "investiture:read" },
          { title: "items.investiture_config", url: "/dashboard/investiture/config", permission: "investiture:read" },
        ],
      },
      {
        title: "items.sla",
        url: "/dashboard/sla",
        icon: Activity,
        permission: "investiture:read",
      },
      {
        title: "items.year_end",
        url: "/dashboard/year-end",
        icon: CalendarOff,
        permission: "permissions:read",
      },
    ],
  },

  // ─── Comunicaciones ──────────────────────────────────────────────────────────
  {
    label: "sections.communications",
    items: [
      {
        title: "items.notifications",
        url: "/dashboard/notifications",
        icon: Bell,
        permission: "notifications:send",
        children: [
          { title: "items.notifications_send", url: "/dashboard/notifications", permission: "notifications:send" },
          { title: "items.notifications_history", url: "/dashboard/notifications/history", permission: "notifications:send" },
        ],
      },
      { title: "items.evidence_folders", url: "/dashboard/folders", icon: FolderOpen, permission: "user_folders:read" },
      {
        title: "items.annual_folders",
        url: "/dashboard/annual-folders",
        icon: FolderArchive,
        permission: "annual_folder_templates:read",
        children: [
          { title: "items.annual_folders_templates", url: "/dashboard/annual-folders/templates", permission: "annual_folder_templates:read" },
          { title: "items.annual_folders_mine", url: "/dashboard/annual-folders", permission: "annual_folder_templates:read" },
          { title: "items.annual_folders_evaluate", url: "/dashboard/annual-folders/evaluate", permission: "evidence_folders:update" },
          { title: "items.annual_folders_rankings", url: "/dashboard/annual-folders/rankings", permission: RANKINGS_READ },
          { title: "items.annual_folders_categories", url: "/dashboard/annual-folders/categories", permission: "award_categories:read" },
        ],
      },
      {
        title: "items.ranking_weights",
        url: "/dashboard/ranking-weights",
        icon: SlidersHorizontal,
        permission: RANKING_WEIGHTS_READ,
      },
      {
        title: "items.member_rankings",
        url: "/dashboard/member-rankings",
        icon: Users2,
        permission: MEMBER_RANKINGS_READ_GLOBAL,
      },
      {
        title: "items.member_ranking_weights",
        url: "/dashboard/member-ranking-weights",
        icon: SlidersHorizontal,
        permission: MEMBER_RANKING_WEIGHTS_READ,
      },
      {
        title: "items.section_rankings",
        url: "/dashboard/section-rankings",
        icon: Layers,
        permission: SECTION_RANKINGS_READ_GLOBAL,
      },
    ],
  },

  // ─── Solicitudes y Reportes ──────────────────────────────────────────────────
  {
    label: "sections.requests_reports",
    items: [
      {
        title: "items.requests",
        url: "/dashboard/requests/transfers",
        icon: ArrowRightLeft,
        permission: "requests:read",
        children: [
          { title: "items.requests_transfers", url: "/dashboard/requests/transfers", permission: "requests:read" },
          { title: "items.requests_assignments", url: "/dashboard/requests/assignments", permission: "requests:read" },
          { title: "items.requests_membership", url: "/dashboard/requests/membership", permission: "club_members:approve" },
        ],
      },
      {
        title: "items.reports",
        url: "/dashboard/reports",
        icon: FileText,
        permission: "reports:read",
        children: [
          { title: "items.reports_mine", url: "/dashboard/reports", permission: "reports:read" },
          { title: "items.reports_supervision", url: "/dashboard/reports/supervision", permission: "reports:read" },
        ],
      },
      {
        title: "items.member_of_month",
        url: "/dashboard/member-of-month",
        icon: Trophy,
        permission: "mom:supervise",
      },
    ],
  },
];
