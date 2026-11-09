import {
  Award,
  ArrowUpDown,
  BarChart3,
  Building2,
  Banknote,
  Bell,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileStack,
  FileText,
  FolderOpen,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Layers,
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
  Tags,
  Tent,
  Trophy,
  CalendarRange,
  User,
  UserCog,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  CATALOGS_INDEX_PATH,
  CONFIGURATION_EXTRA_MATCH_PATHS,
  CONFIGURATION_INDEX_PATH,
} from "./index-pages";
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
  /** RBAC gate — falls back to the screen catalog `viewAny` for this id when omitted */
  access?: NavAccess;
  /** How to mark this sub-item active in the sidebar */
  activeMatch?: "exact" | "prefix" | "clubs-list" | "evidence-folders";
  /** Extra path prefixes that also mark this leaf active (pages reached from an index). */
  matchPaths?: string[];
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
  /** RBAC gate — falls back to the screen catalog `viewAny` for this id when omitted */
  access?: NavAccess;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
  activeMatch?: "exact" | "prefix" | "clubs-list";
  /** Extra path prefixes that also mark this link active (pages reached from an index). */
  matchPaths?: string[];
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
    label: "Por atender",
    items: [
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
            id: "honor-instructor-proposals",
            title: "Propuestas de instructor",
            url: "/dashboard/honor-instructor-proposals",
            icon: UserCog,
            activeMatch: "prefix",
          },
          {
            id: "institutional-certificate-requests",
            title: "Bandeja institucional GM",
            url: "/dashboard/institutional-certificate-requests",
            icon: GraduationCap,
            activeMatch: "prefix",
          },
          {
            id: "clubs-evidence-folders-list",
            title: "Carpetas de evidencias",
            url: "/dashboard/clubs/evidence-folders",
            icon: FolderOpen,
            activeMatch: "evidence-folders",
          },
        ],
      },
      {
        id: "investiture-requests",
        title: "Autorizaciones de investidura",
        url: "/dashboard/investiture-requests",
        icon: ShieldCheck,
        activeMatch: "prefix",
      },
      {
        id: "certifications-reviews",
        title: "Revisiones GM",
        url: "/dashboard/certifications/reviews",
        icon: ClipboardCheck,
        activeMatch: "prefix",
      },
    ],
  },
  {
    id: 2,
    label: "Clubes y miembros",
    items: [
      {
        id: "clubs",
        title: "Clubes",
        url: "/dashboard/clubs",
        icon: Building2,
        activeMatch: "clubs-list",
      },
      {
        id: "users",
        title: "Usuarios",
        url: "/dashboard/users",
        icon: User,
        activeMatch: "prefix",
      },
      {
        id: "coordination",
        title: "Coordinación",
        url: "/dashboard/coordination",
        icon: Signpost,
        activeMatch: "prefix",
      },
      {
        id: "activities",
        title: "Actividades",
        url: "/dashboard/clubs/activities",
        icon: CalendarDays,
        activeMatch: "prefix",
      },
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
    id: 3,
    label: "Operación",
    items: [
      {
        id: "finances",
        title: "Finanzas de clubes",
        url: "/dashboard/finances",
        icon: Banknote,
        activeMatch: "prefix",
      },
      {
        id: "payment-orders",
        title: "Órdenes de pago",
        url: "/dashboard/payment-orders",
        icon: Receipt,
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
          {
            id: "insurance-config",
            title: "Configuración",
            url: "/dashboard/insurance/config",
            icon: Shield,
            activeMatch: "prefix",
          },
        ],
      },
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
    id: 4,
    label: "Evaluación y eventos",
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
          {
            id: "reports-quarterly",
            title: "Informes trimestrales",
            url: "/dashboard/reports/quarterly",
            icon: CalendarDays,
            activeMatch: "prefix",
          },
          {
            id: "reports-annual",
            title: "Informes anuales",
            url: "/dashboard/reports/annual",
            icon: CalendarRange,
            activeMatch: "prefix",
          },
        ],
      },
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
          {
            id: "campamentos-pedidos-catalogo",
            title: "Catálogo pedidos",
            url: "/dashboard/campamentos/pedidos/catalogo",
            icon: ShoppingBag,
            activeMatch: "prefix",
          },
          {
            id: "campamentos-pedidos-bandeja",
            title: "Bandeja pedidos",
            url: "/dashboard/campamentos/pedidos/bandeja",
            icon: ClipboardList,
            activeMatch: "prefix",
          },
        ],
      },
      {
        id: "certifications-list",
        title: "Certificaciones GM",
        url: "/dashboard/certifications",
        icon: ShieldCheck,
        activeMatch: "prefix",
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
    id: 5,
    label: "Administración",
    items: [
      {
        id: "admin-catalogs",
        title: "Catálogos",
        url: CATALOGS_INDEX_PATH,
        icon: Layers,
        activeMatch: "prefix",
      },
      {
        id: "admin-settings",
        title: "Configuración",
        url: CONFIGURATION_INDEX_PATH,
        icon: Settings2,
        activeMatch: "prefix",
        matchPaths: CONFIGURATION_EXTRA_MATCH_PATHS,
      },
    ],
  },
];
