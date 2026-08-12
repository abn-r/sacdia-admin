import {
  Award,
  ArrowUpDown,
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  Banknote,
  Bell,
  Calendar,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  FileStack,
  FileText,
  FolderOpen,
  Globe,
  GraduationCap,
  Grid3X3,
  AlertCircle,
  Key,
  Landmark,
  LayoutDashboard,
  Layers,
  MapPin,
  Package,
  Scale,
  Settings2,
  Shield,
  ShieldCheck,
  Library,
  Receipt,
  Tag,
  ShoppingBag,
  Signpost,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Tent,
  Trophy,
  Church,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { NavAccess } from "./nav-access";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url?: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
  /** RBAC gate — falls back to NAV_ITEM_ACCESS[id] when omitted */
  access?: NavAccess;
  /** How to mark this sub-item active in the sidebar */
  activeMatch?: "exact" | "prefix" | "clubs-list" | "evidence-folders";
  /** Nested submenu entries */
  subItems?: NavSubItem[];
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
  /** RBAC gate — falls back to NAV_ITEM_ACCESS[id] when omitted */
  access?: NavAccess;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
  activeMatch?: "exact" | "prefix" | "clubs-list";
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

/**
 * Sidebar orientado a personal administrativo (campo local, unión, división, sistema).
 * No es el panel operativo del líder de club: agrupa supervisión, validación y configuración territorial.
 */
export const sidebarItems: NavGroup[] = [
  {
    id: 0,
    items: [
      {
        id: "home",
        title: "Inicio",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 1,
    label: "Gestión de clubes",
    items: [
      {
        id: "users",
        title: "Usuarios",
        url: "/dashboard/users",
        icon: User,
        activeMatch: "prefix",
      },
      {
        id: "clubs",
        title: "Clubes",
        url: "/dashboard/clubs",
        icon: Building2,
        activeMatch: "clubs-list",
      },
      {
        id: "enrollments",
        title: "Inscripciones",
        url: "/dashboard/enrollments",
        icon: ClipboardList,
        activeMatch: "prefix",
      },
      {
        id: "requests",
        title: "Solicitudes",
        icon: ArrowUpDown,
        subItems: [
          {
            id: "requests-transfers",
            title: "Traslados",
            url: "/dashboard/requests/transfers",
            icon: ArrowUpDown,
            activeMatch: "prefix",
          },
          {
            id: "requests-assignments",
            title: "Asignaciones",
            url: "/dashboard/requests/assignments",
            icon: UserPlus,
            activeMatch: "prefix",
          },
          {
            id: "requests-membership",
            title: "Membresía",
            url: "/dashboard/requests/membership",
            icon: Users,
            activeMatch: "prefix",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "Operaciones",
    items: [
      {
        id: "finances",
        title: "Finanzas de clubes",
        url: "/dashboard/finances",
        icon: Banknote,
        activeMatch: "prefix",
      },
      {
        id: "club-inventory",
        title: "Inventario de clubes",
        url: "/dashboard/inventory",
        icon: Package,
        activeMatch: "prefix",
      },
      {
        id: "insurance",
        title: "Seguros",
        icon: Shield,
        subItems: [
          {
            id: "insurance-by-section",
            title: "Por sección",
            url: "/dashboard/insurance",
            icon: Shield,
            activeMatch: "exact",
          },
          {
            id: "insurance-expiring",
            title: "Por vencer",
            url: "/dashboard/insurance/expiring",
            icon: Shield,
            activeMatch: "prefix",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Validación e investiduras",
    items: [
      {
        id: "investiture",
        title: "Investidura",
        icon: Sparkles,
        subItems: [
          {
            id: "investiture-pending",
            title: "Pendientes",
            url: "/dashboard/investiture",
            icon: Sparkles,
            activeMatch: "exact",
          },
          {
            id: "investiture-pipeline",
            title: "Seguimiento",
            url: "/dashboard/investiture/pipeline",
            icon: ClipboardList,
            activeMatch: "prefix",
          },
          {
            id: "investiture-config",
            title: "Configuración",
            url: "/dashboard/investiture/config",
            icon: Settings2,
            activeMatch: "prefix",
          },
        ],
      },
      {
        id: "validations",
        title: "Validaciones",
        icon: ClipboardCheck,
        subItems: [
          {
            id: "validations-investitures",
            title: "Investiduras de club",
            url: "/dashboard/clubs/validations",
            icon: ClipboardCheck,
            activeMatch: "prefix",
          },
          {
            id: "certificate-bulk-imports",
            title: "Cargas certificados",
            url: "/dashboard/certificate-bulk-imports",
            icon: FileText,
            activeMatch: "prefix",
          },
          {
            id: "clubs-evidence-folders",
            title: "Evidencias",
            icon: FolderOpen,
            subItems: [
              {
                id: "clubs-evidence-folders-templates",
                title: "Plantillas",
                url: "/dashboard/clubs/evidence-folders/templates",
                icon: FileStack,
                activeMatch: "prefix",
              },
              {
                id: "clubs-evidence-folders-list",
                title: "Carpetas",
                url: "/dashboard/clubs/evidence-folders",
                icon: FolderOpen,
                activeMatch: "evidence-folders",
              },
            ],
          },
        ],
      },
      {
        id: "certifications",
        title: "Certificaciones GM",
        icon: ShieldCheck,
        subItems: [
          {
            id: "certifications-list",
            title: "Catálogo y progreso",
            url: "/dashboard/certifications",
            icon: ShieldCheck,
            activeMatch: "exact",
          },
          {
            id: "certifications-reviews",
            title: "Revisiones de certificaciones",
            url: "/dashboard/certifications/reviews",
            icon: ClipboardCheck,
            activeMatch: "prefix",
          },
        ],
      },
      {
        id: "year-end",
        title: "Cierre de año",
        url: "/dashboard/year-end",
        icon: CalendarClock,
        activeMatch: "prefix",
      },
    ],
  },
  {
    id: 4,
    label: "Clasificaciones y análisis",
    items: [
      {
        id: "annual-folders",
        title: "Carpetas anuales",
        icon: Trophy,
        subItems: [
          {
            id: "annual-folders-evaluate",
            title: "Evaluación",
            url: "/dashboard/annual-folders/evaluate",
            icon: ClipboardCheck,
            activeMatch: "prefix",
          },
          {
            id: "annual-folders-rankings",
            title: "Clasificación",
            url: "/dashboard/annual-folders/rankings",
            icon: Trophy,
            activeMatch: "prefix",
          },
          {
            id: "annual-folders-templates",
            title: "Plantillas",
            url: "/dashboard/annual-folders/templates",
            icon: FileStack,
            activeMatch: "prefix",
          },
          {
            id: "annual-folders-ranking-config",
            title: "Config. de clasificación",
            url: "/dashboard/annual-folders/ranking-config",
            icon: Settings2,
            activeMatch: "prefix",
          },
          {
            id: "annual-folders-categories",
            title: "Categorías",
            url: "/dashboard/annual-folders/categories",
            icon: Tags,
            activeMatch: "prefix",
          },
        ],
      },
      {
        id: "ranking-weights",
        title: "Pesos de clasificación",
        url: "/dashboard/ranking-weights",
        icon: SlidersHorizontal,
        activeMatch: "prefix",
      },
      {
        id: "section-rankings",
        title: "Clasificaciones por sección",
        url: "/dashboard/section-rankings",
        icon: BarChart3,
        activeMatch: "prefix",
      },
      {
        id: "member-of-month",
        title: "Miembro del mes",
        url: "/dashboard/member-of-month",
        icon: Award,
        activeMatch: "prefix",
      },
      {
        id: "reports",
        title: "Reportes",
        icon: FileText,
        subItems: [
          {
            id: "reports-list",
            title: "Mis reportes",
            url: "/dashboard/reports",
            icon: FileText,
            activeMatch: "exact",
          },
          {
            id: "reports-supervision",
            title: "Supervisión territorial",
            url: "/dashboard/reports/supervision",
            icon: ClipboardCheck,
            activeMatch: "prefix",
          },
        ],
      },
    ],
  },
  {
    id: 5,
    label: "Campamentos",
    items: [
      {
        id: "campamentos",
        title: "Campamentos",
        icon: Tent,
        subItems: [
          {
            id: "campamentos-list-local",
            title: "Campamentos",
            url: "/dashboard/campamentos",
            icon: Tent,
            activeMatch: "exact",
          },
          {
            id: "campamentos-list-union",
            title: "Campamentos de unión",
            url: "/dashboard/campamentos/union",
            icon: Landmark,
            activeMatch: "prefix",
          },
          {
            id: "campamentos-plantillas",
            title: "Plantillas",
            url: "/dashboard/campamentos/plantillas",
            icon: FileStack,
            activeMatch: "prefix",
          },
          {
            id: "campamentos-judges",
            title: "Jueces",
            url: "/dashboard/campamentos/jueces",
            icon: Scale,
            activeMatch: "prefix",
          },
        ],
      },
      {
        id: "activities",
        title: "Actividades",
        url: "/dashboard/clubs/activities",
        icon: CalendarDays,
        activeMatch: "prefix",
      },
    ],
  },
  {
    id: 6,
    label: "Materiales",
    items: [
      {
        id: "materials",
        title: "Materiales",
        icon: ShoppingBag,
        subItems: [
          {
            id: "materials-inbox",
            title: "Pedidos",
            url: "/dashboard/materials/inbox",
            icon: Package,
            activeMatch: "prefix",
          },
          {
            id: "materials-inventory",
            title: "Inventario",
            url: "/dashboard/materials/inventory",
            icon: Layers,
            activeMatch: "prefix",
          },
          {
            id: "materials-categories",
            title: "Categorías",
            url: "/dashboard/materials/categories",
            icon: Tag,
            activeMatch: "prefix",
          },
          {
            id: "materials-receipts",
            title: "Comprobantes",
            url: "/dashboard/materials/receipts",
            icon: Receipt,
            activeMatch: "prefix",
          },
        ],
      },
      {
        id: "resources",
        title: "Recursos",
        icon: Library,
        subItems: [
          {
            id: "resources-list",
            title: "Biblioteca",
            url: "/dashboard/resources",
            icon: Library,
            activeMatch: "exact",
          },
          {
            id: "resources-categories",
            title: "Categorías",
            url: "/dashboard/resources/categories",
            icon: FolderOpen,
            activeMatch: "prefix",
          },
        ],
      },
    ],
  },
  {
    id: 7,
    label: "Comunicaciones",
    items: [
      {
        id: "notifications",
        title: "Notificaciones",
        icon: Bell,
        subItems: [
          {
            id: "notifications-hub",
            title: "Resumen",
            url: "/dashboard/configuration/notifications",
            icon: Bell,
            activeMatch: "exact",
          },
          {
            id: "notifications-history",
            title: "Gestión",
            url: "/dashboard/configuration/notifications/history",
            icon: Bell,
            activeMatch: "prefix",
          },
          {
            id: "notifications-categories",
            title: "Categorías",
            url: "/dashboard/configuration/notifications/categories",
            icon: Tags,
            activeMatch: "prefix",
          },
        ],
      },
    ],
  },
  {
    id: 8,
    label: "Administración",
    items: [
      {
        id: "admin-catalogs",
        title: "Catálogos",
        icon: Layers,
        subItems: [
          {
            id: "catalogs-geography",
            title: "Geografía",
            icon: MapPin,
            subItems: [
              {
                id: "catalogs-divisions",
                title: "Divisiones",
                url: "/dashboard/catalogs/divisions",
                icon: Landmark,
              },
              {
                id: "catalogs-countries",
                title: "Países",
                url: "/dashboard/catalogs/countries",
                icon: Globe,
              },
              {
                id: "catalogs-unions",
                title: "Uniones",
                url: "/dashboard/catalogs/unions",
                icon: Building2,
              },
              {
                id: "catalogs-local-fields",
                title: "Campos locales",
                url: "/dashboard/catalogs/local-fields",
                icon: MapPin,
              },
              {
                id: "catalogs-districts",
                title: "Distritos",
                url: "/dashboard/catalogs/districts",
                icon: Signpost,
              },
              {
                id: "catalogs-churches",
                title: "Iglesias",
                url: "/dashboard/catalogs/churches",
                icon: Church,
              },
            ],
          },
          {
            id: "catalogs-clubs",
            title: "Clubes",
            icon: Building2,
            subItems: [
              {
                id: "catalogs-club-ideals",
                title: "Ideales",
                url: "/dashboard/catalogs/club-ideals",
                icon: Sparkles,
              },
              {
                id: "catalogs-club-types",
                title: "Tipos de club",
                url: "/dashboard/catalogs/club-types",
                icon: Layers,
              },
              {
                id: "catalogs-classes",
                title: "Clases",
                url: "/dashboard/catalogs/classes",
                icon: GraduationCap,
              },
              {
                id: "catalogs-class-modules",
                title: "Módulos de clase",
                url: "/dashboard/catalogs/class-modules",
                icon: BookOpen,
              },
              {
                id: "catalogs-class-sections",
                title: "Secciones de clase",
                url: "/dashboard/catalogs/class-sections",
                icon: Grid3X3,
              },
              {
                id: "catalogs-certifications",
                title: "Certificaciones GM",
                url: "/dashboard/catalogs/certifications",
                icon: ShieldCheck,
              },
              {
                id: "catalogs-activity-types",
                title: "Tipos de actividad",
                url: "/dashboard/catalogs/activity-types",
                icon: Activity,
              },
              {
                id: "catalogs-ecclesiastical-years",
                title: "Años eclesiásticos",
                url: "/dashboard/catalogs/ecclesiastical-years",
                icon: Calendar,
              },
            ],
          },
          {
            id: "catalogs-health",
            title: "Salud y referencia",
            icon: AlertCircle,
            subItems: [
              {
                id: "catalogs-allergies",
                title: "Alergias",
                url: "/dashboard/catalogs/allergies",
                icon: AlertCircle,
              },
              {
                id: "catalogs-diseases",
                title: "Enfermedades",
                url: "/dashboard/catalogs/diseases",
                icon: AlertCircle,
              },
              {
                id: "catalogs-medicines",
                title: "Medicamentos",
                url: "/dashboard/catalogs/medicines",
                icon: Package,
              },
              {
                id: "catalogs-relationship-types",
                title: "Tipos de relación",
                url: "/dashboard/catalogs/relationship-types",
                icon: Users,
              },
            ],
          },
          {
            id: "catalogs-business",
            title: "Negocio",
            icon: DollarSign,
            subItems: [
              {
                id: "catalogs-finance-categories",
                title: "Categorías finanzas",
                url: "/dashboard/catalogs/finance-categories",
                icon: DollarSign,
              },
              {
                id: "catalogs-inventory-categories",
                title: "Categorías inventario",
                url: "/dashboard/catalogs/inventory-categories",
                icon: Package,
              },
            ],
          },
          {
            id: "catalogs-honors",
            title: "Especialidades",
            icon: Award,
            subItems: [
              {
                id: "catalogs-honor-categories",
                title: "Categorías",
                url: "/dashboard/catalogs/honor-categories",
                icon: Tags,
              },
              {
                id: "catalogs-honors",
                title: "Especialidades",
                url: "/dashboard/catalogs/honors",
                icon: Award,
              },
            ],
          },
          {
            id: "catalogs-campamentos",
            title: "Campamentos",
            icon: Tent,
            subItems: [
              {
                id: "catalogs-camporee-event-types",
                title: "Tipos de evento",
                url: "/dashboard/catalogs/camporee-event-types",
                icon: Tags,
                activeMatch: "prefix",
              },
            ],
          },
        ],
      },
      {
        id: "admin-local-field",
        title: "Campo local",
        icon: Building2,
        subItems: [
          {
            id: "admin-local-field-payment-methods",
            title: "Métodos de pago",
            url: "/dashboard/configuration/local-field/payment-methods",
            icon: Banknote,
            activeMatch: "prefix",
          },
          {
            id: "admin-local-field-delivery",
            title: "Entrega de materiales",
            url: "/dashboard/configuration/local-field/delivery",
            icon: Package,
            activeMatch: "prefix",
          },
        ],
      },
      {
        id: "admin-campamentos-config",
        title: "Config. campamentos",
        icon: Settings2,
        subItems: [
          {
            id: "admin-campamentos-config-local",
            title: "Campo local",
            url: "/dashboard/campamentos/configuracion/campo-local",
            icon: Settings2,
            activeMatch: "prefix",
          },
          {
            id: "admin-campamentos-config-union",
            title: "Unión",
            url: "/dashboard/campamentos/configuracion/union",
            icon: Settings2,
            activeMatch: "prefix",
          },
        ],
      },
      {
        id: "admin-settings",
        title: "Configuración",
        icon: Settings2,
        subItems: [
          {
            id: "admin-settings-scoring-categories",
            title: "Categorías scoring",
            url: "/dashboard/settings/scoring-categories",
            icon: Tags,
            activeMatch: "prefix",
          },
        ],
      },
      {
        id: "admin-system",
        title: "Sistema",
        icon: Key,
        subItems: [
          {
            id: "admin-system-variables",
            title: "Variables",
            url: "/dashboard/configuration/variables",
            icon: Settings2,
            activeMatch: "prefix",
          },
          {
            id: "admin-system-jobs",
            title: "Jobs y colas",
            url: "/dashboard/system/jobs",
            icon: Activity,
            activeMatch: "exact",
          },
          {
            id: "admin-system-jobs-history",
            title: "Historial jobs",
            url: "/dashboard/system/jobs/history",
            icon: ClipboardList,
            activeMatch: "prefix",
          },
          {
            id: "admin-system-achievements",
            title: "Logros",
            url: "/dashboard/configuration/achievements",
            icon: Trophy,
            activeMatch: "prefix",
          },
          {
            id: "admin-system-roles",
            title: "Roles",
            url: "/dashboard/configuration/roles",
            icon: Users,
            activeMatch: "prefix",
          },
          {
            id: "admin-system-permissions",
            title: "Permisos",
            url: "/dashboard/configuration/permissions",
            icon: Key,
            activeMatch: "prefix",
          },
          {
            id: "admin-system-matrix",
            title: "Matriz de seguridad",
            url: "/dashboard/configuration/matrix",
            icon: Grid3X3,
            activeMatch: "prefix",
          },
        ],
      },
    ],
  },
];
