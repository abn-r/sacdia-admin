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
  type LucideIcon,
} from "lucide-react";

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
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard:view",
      },
      {
        title: "Usuarios",
        url: "/dashboard/users",
        icon: Users,
        permission: "users:read",
      },
    ],
  },

  // ─── Catálogos ───────────────────────────────────────────────────────────────
  // Static reference data that admins configure once and rarely change:
  // geographic hierarchy, medical lookups, ecclesiastical years, club metadata,
  // specialty categories, activity types, resource library, award/scoring tiers.
  {
    label: "Catálogos",
    items: [
      {
        title: "Catálogos",
        url: "/dashboard/catalogs",
        icon: BookOpen,
        children: [
          { title: "Resumen", url: "/dashboard/catalogs" },
          { title: "Países", url: "/dashboard/catalogs/geography/countries", permission: "countries:read" },
          { title: "Uniones", url: "/dashboard/catalogs/geography/unions", permission: "unions:read" },
          { title: "Campos locales", url: "/dashboard/catalogs/geography/local-fields", permission: "local_fields:read" },
          { title: "Distritos", url: "/dashboard/catalogs/geography/districts", permission: "districts:read" },
          { title: "Iglesias", url: "/dashboard/catalogs/geography/churches", permission: "churches:read" },
          { title: "Alergias", url: "/dashboard/catalogs/allergies", permission: "catalogs:read" },
          { title: "Enfermedades", url: "/dashboard/catalogs/diseases", permission: "catalogs:read" },
          { title: "Medicamentos", url: "/dashboard/catalogs/medicines", permission: "catalogs:read" },
          { title: "Tipos de relación", url: "/dashboard/catalogs/relationship-types", permission: "catalogs:read" },
          { title: "Años eclesiásticos", url: "/dashboard/catalogs/ecclesiastical-years", permission: "ecclesiastical_years:read" },
          { title: "Tipos de club", url: "/dashboard/catalogs/club-types", permission: "catalogs:read" },
          { title: "Ideales de club", url: "/dashboard/catalogs/club-ideals", permission: "catalogs:read" },
          { title: "Categorías de especialidades", url: "/dashboard/catalogs/honor-categories", permission: "honor_categories:read" },
          { title: "Tipos de actividad", url: "/dashboard/catalogs/activity-types", permission: "catalogs:read" },
        ],
      },
      {
        title: "Recursos",
        url: "/dashboard/resources",
        icon: LibraryBig,
        permission: "resources:read",
        children: [
          { title: "Todos los recursos", url: "/dashboard/resources", permission: "resources:read" },
          { title: "Categorías", url: "/dashboard/resources/categories", permission: "resource_categories:read" },
        ],
      },
    ],
  },

  // ─── Sistema ─────────────────────────────────────────────────────────────────
  // Platform administration: RBAC, system configuration, and scoring tiers.
  // Distinct from Catálogos because these entries govern how the platform
  // itself behaves (access control, runtime config, point rules) rather than
  // describing domain entities.
  {
    label: "Sistema",
    items: [
      {
        title: "Roles y permisos",
        url: "/dashboard/rbac",
        icon: Shield,
        permission: "permissions:read",
        children: [
          { title: "Permisos", url: "/dashboard/rbac/permissions", permission: "permissions:read" },
          { title: "Roles", url: "/dashboard/rbac/roles", permission: "roles:read" },
        ],
      },
      {
        title: "Configuración",
        url: "/dashboard/settings",
        icon: Settings2,
        permission: "permissions:read",
        children: [
          { title: "Sistema", url: "/dashboard/settings", permission: "permissions:read" },
          { title: "Categorías de Puntuación", url: "/dashboard/settings/scoring-categories", permission: "scoring_categories:read" },
        ],
      },
      {
        title: "Jobs & Colas",
        url: "/dashboard/system/jobs",
        icon: Activity,
        permission: "permissions:read",
      },
    ],
  },

  // ─── Gestión de Clubes ───────────────────────────────────────────────────────
  // Daily and weekly workflows tied to club operations: enrollments, activities,
  // finances, inventory, certifications, insurance, and camporees.
  {
    label: "Gestión de Clubes",
    items: [
      { title: "Clubes", url: "/dashboard/clubs", icon: Building2, permission: "clubs:read" },
      {
        title: "Camporees",
        url: "/dashboard/camporees",
        icon: Tent,
        permission: "camporees:read",
        children: [
          { title: "Locales", url: "/dashboard/camporees", permission: "camporees:read" },
          { title: "Unión", url: "/dashboard/camporees/union", permission: "camporees:read" },
        ],
      },
      { title: "Clases", url: "/dashboard/classes", icon: GraduationCap, permission: "classes:read" },
      { title: "Inscripciones", url: "/dashboard/enrollments", icon: ClipboardList, permission: "classes:read" },
      { title: "Especialidades", url: "/dashboard/honors", icon: Award, permission: "honors:read" },
      { title: "Logros", url: "/dashboard/achievements", icon: Trophy, permission: "achievements:manage" },
      { title: "Actividades", url: "/dashboard/activities", icon: Calendar, permission: "activities:read" },
      { title: "Finanzas", url: "/dashboard/finances", icon: DollarSign, permission: "finances:read" },
      { title: "Inventario", url: "/dashboard/inventory", icon: Package, permission: "inventory:read" },
      { title: "Certificaciones", url: "/dashboard/certifications", icon: ShieldCheck, permission: "user_certifications:read" },
      {
        title: "Seguros",
        url: "/dashboard/insurance",
        icon: Heart,
        permission: "insurance:read",
        children: [
          { title: "Por sección", url: "/dashboard/insurance", permission: "insurance:read" },
          { title: "Por vencer", url: "/dashboard/insurance/expiring", permission: "insurance:read" },
        ],
      },
    ],
  },

  // ─── Validación e Investiduras ───────────────────────────────────────────────
  // Time-sensitive approval workflows: evidence review, investiture pipeline,
  // SLA monitoring, and the annual year-end closing action.
  // Cierre de año lives here (not Sistema) because it is a one-time irreversible
  // operational trigger per ecclesiastical year, not a platform config.
  {
    label: "Validación e Investiduras",
    items: [
      {
        title: "Validación",
        url: "/dashboard/validation",
        icon: ClipboardCheck,
        permission: "validation:read",
      },
      {
        title: "Revisión de Evidencias",
        url: "/dashboard/evidence-review",
        icon: FileSearch,
        permission: "investiture:read",
      },
      {
        title: "Investiduras",
        url: "/dashboard/investiture",
        icon: Star,
        permission: "investiture:read",
        children: [
          { title: "Pendientes", url: "/dashboard/investiture", permission: "investiture:read" },
          { title: "Pipeline", url: "/dashboard/investiture/pipeline", permission: "investiture:read" },
          { title: "Configuración", url: "/dashboard/investiture/config", permission: "investiture:read" },
        ],
      },
      {
        title: "SLA Dashboard",
        url: "/dashboard/sla",
        icon: Activity,
        permission: "investiture:read",
      },
      {
        title: "Cierre de año",
        url: "/dashboard/year-end",
        icon: CalendarOff,
        permission: "permissions:read",
      },
    ],
  },

  // ─── Comunicaciones ──────────────────────────────────────────────────────────
  // Outbound notifications and evidence/annual folder workflows.
  // Annual Folders kept unified here (not split) because all five children
  // belong to the same user journey (coordinators manage their folder end-to-end).
  // Plantillas and Categorias de premios are catalog-like but splitting them out
  // would leave the parent entry orphaned and fragment a naturally cohesive flow.
  {
    label: "Comunicaciones",
    items: [
      {
        title: "Notificaciones",
        url: "/dashboard/notifications",
        icon: Bell,
        permission: "notifications:send",
        children: [
          { title: "Enviar", url: "/dashboard/notifications", permission: "notifications:send" },
          { title: "Historial", url: "/dashboard/notifications/history", permission: "notifications:send" },
        ],
      },
      { title: "Carpetas de Evidencias", url: "/dashboard/folders", icon: FolderOpen, permission: "user_folders:read" },
      {
        title: "Carpeta Anual",
        url: "/dashboard/annual-folders",
        icon: FolderArchive,
        permission: "annual_folder_templates:read",
        children: [
          { title: "Plantillas", url: "/dashboard/annual-folders/templates", permission: "annual_folder_templates:read" },
          { title: "Mi Carpeta", url: "/dashboard/annual-folders", permission: "annual_folder_templates:read" },
          { title: "Evaluacion", url: "/dashboard/annual-folders/evaluate", permission: "evidence_folders:update" },
          { title: "Rankings", url: "/dashboard/annual-folders/rankings", permission: "rankings:read" },
          { title: "Categorias de premios", url: "/dashboard/annual-folders/categories", permission: "award_categories:read" },
        ],
      },
    ],
  },

  // ─── Solicitudes y Reportes ──────────────────────────────────────────────────
  // Cross-club approval flows (transfers, assignments, memberships) and
  // generated reports — all transactional, time-bound, actor-initiated.
  {
    label: "Solicitudes y Reportes",
    items: [
      {
        title: "Solicitudes",
        url: "/dashboard/requests/transfers",
        icon: ArrowRightLeft,
        permission: "requests:read",
        children: [
          { title: "Transferencias", url: "/dashboard/requests/transfers", permission: "requests:read" },
          { title: "Asignaciones", url: "/dashboard/requests/assignments", permission: "requests:read" },
          { title: "Membresías", url: "/dashboard/requests/membership", permission: "club_members:approve" },
        ],
      },
      {
        title: "Reportes Mensuales",
        url: "/dashboard/reports",
        icon: FileText,
        permission: "reports:read",
        children: [
          { title: "Mis reportes", url: "/dashboard/reports", permission: "reports:read" },
          { title: "Supervisión", url: "/dashboard/reports/supervision", permission: "reports:read" },
        ],
      },
      {
        title: "Miembro del Mes",
        url: "/dashboard/member-of-month",
        icon: Trophy,
        permission: "mom:supervise",
      },
    ],
  },
];
