import {
  Activity,
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
  FileSearch,
  FileStack,
  FileText,
  FolderOpen,
  GraduationCap,
  Key,
  Landmark,
  LayoutDashboard,
  Layers,
  Package,
  Scale,
  ScrollText,
  Settings2,
  Shield,
  ShieldCheck,
  Library,
  Receipt,
  ShoppingBag,
  Signpost,
  Tent,
  Trophy,
  CalendarRange,
  User,
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
  /** `nav` message key for the title when it must differ from the id-derived one. */
  labelKey?: string;
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
  /** `nav` message key for the title when it must differ from the id-derived one. */
  labelKey?: string;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
  activeMatch?: "exact" | "prefix" | "clubs-list" | "evidence-folders";
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
 *
 * Parent ids (`requests`, `classes-honors`, `certificates`, ...) are never gated:
 * a parent shows when any child passes the screen-catalog gate of its own id.
 */
export const sidebarItems: NavGroup[] = [
  {
    id: 0,
    items: [{ id: "home", title: "Inicio", url: "/dashboard", icon: LayoutDashboard }],
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
          { id: "requests-transfers", title: "Traslados", url: "/dashboard/requests/transfers", icon: ArrowUpDown, activeMatch: "prefix" },
          { id: "requests-assignments", title: "Asignaciones", url: "/dashboard/requests/assignments", icon: UserPlus, activeMatch: "prefix" },
          { id: "requests-membership", title: "Membresía", url: "/dashboard/requests/membership", icon: Users, activeMatch: "prefix" },
          { id: "club-enrollments-review", title: "Registros anuales", url: "/dashboard/club-enrollments", icon: ClipboardList, activeMatch: "prefix" },
        ],
      },
      {
        // One page with tabs (Por aprobar · Evidencias · Propuestas de instructor · Historial).
        id: "validations-investitures",
        title: "Especialidades y clases",
        labelKey: "sidebar.classes_honors",
        url: "/dashboard/clubs/validations",
        icon: GraduationCap,
        activeMatch: "prefix",
        matchPaths: ["/dashboard/honor-instructor-proposals"],
      },
      {
        id: "investiture-requests",
        title: "Investiduras",
        url: "/dashboard/investiture-requests",
        icon: ShieldCheck,
        activeMatch: "prefix",
      },
      {
        id: "certificates",
        title: "Certificados",
        icon: FileText,
        subItems: [
          { id: "certificate-bulk-imports", title: "Cargas por certificado", url: "/dashboard/certificate-bulk-imports", icon: FileStack, activeMatch: "prefix" },
          { id: "institutional-certificate-requests", title: "Validación GM", url: "/dashboard/institutional-certificate-requests", icon: Landmark, activeMatch: "prefix" },
          { id: "certifications-reviews", title: "Certificaciones", url: "/dashboard/certifications/reviews", icon: ClipboardCheck, activeMatch: "prefix" },
          { id: "service-credentials-review", title: "Constancias de consejería", url: "/dashboard/service-credentials", icon: FileSearch, activeMatch: "prefix" },
        ],
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
    id: 2,
    label: "Clubes y miembros",
    items: [
      { id: "clubs", title: "Clubes", url: "/dashboard/clubs", icon: Building2, activeMatch: "clubs-list" },
      { id: "activities", title: "Actividades", url: "/dashboard/clubs/activities", icon: CalendarDays, activeMatch: "prefix" },
      { id: "users", title: "Usuarios", url: "/dashboard/users", icon: User, activeMatch: "prefix" },
      { id: "coordination", title: "Coordinación", url: "/dashboard/coordination", icon: Signpost, activeMatch: "prefix" },
      {
        // Sent history, compose and categories are one page with tabs.
        id: "notifications-history",
        title: "Notificaciones",
        labelKey: "items.notifications",
        url: "/dashboard/notifications",
        icon: Bell,
        activeMatch: "prefix",
        matchPaths: ["/dashboard/configuration/notifications"],
      },
    ],
  },
  {
    id: 3,
    label: "Operación",
    items: [
      { id: "finances", title: "Finanzas", url: "/dashboard/finances", icon: Banknote, activeMatch: "prefix" },
      { id: "payment-orders", title: "Órdenes de pago", url: "/dashboard/payment-orders", icon: Receipt, activeMatch: "prefix" },
      { id: "club-inventory", title: "Inventario", url: "/dashboard/inventory", icon: Package, activeMatch: "prefix" },
      {
        id: "insurance",
        title: "Seguros",
        icon: Shield,
        subItems: [
          { id: "insurance-by-section", title: "Por sección", url: "/dashboard/insurance", icon: Shield, activeMatch: "exact" },
          { id: "insurance-config", title: "Configuración", url: "/dashboard/insurance/config", icon: Shield, activeMatch: "prefix" },
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
            matchPaths: ["/dashboard/materials/request", "/dashboard/materials/receipts"],
          },
          {
            // The catalog page keeps the products screen id; categories are a tab.
            id: "materials-inventory",
            title: "Catálogo",
            labelKey: "sidebar.materials_catalog",
            url: "/dashboard/materials/catalog",
            icon: Layers,
            activeMatch: "prefix",
            matchPaths: ["/dashboard/materials/inventory", "/dashboard/materials/categories"],
          },
          {
            id: "admin-local-field-payment-methods",
            title: "Configuración",
            labelKey: "items.materials_config",
            url: "/dashboard/configuration/local-field/payment-methods",
            icon: Settings2,
            activeMatch: "prefix",
            matchPaths: ["/dashboard/configuration/local-field", "/dashboard/materials/config"],
          },
        ],
      },
      {
        // Biblioteca and Categorías are tabs of one page.
        id: "resources-list",
        title: "Recursos",
        labelKey: "items.resources",
        url: "/dashboard/resources",
        icon: Library,
        activeMatch: "prefix",
      },
    ],
  },
  {
    id: 4,
    label: "Evaluación y eventos",
    items: [
      {
        id: "annual-folders",
        title: "Progreso anual",
        icon: Trophy,
        subItems: [
          { id: "annual-folders-rankings", title: "Clubes", url: "/dashboard/annual-folders/rankings", icon: Trophy, activeMatch: "prefix" },
          { id: "annual-folders-ranking-config", title: "Configuración", url: "/dashboard/annual-folders/ranking-config", icon: Settings2, activeMatch: "prefix" },
        ],
      },
      { id: "section-rankings", title: "Progreso por sección", url: "/dashboard/section-rankings", icon: BarChart3, activeMatch: "prefix" },
      {
        id: "reports",
        title: "Reportes",
        icon: FileText,
        subItems: [
          { id: "reports-list", title: "Mis reportes", url: "/dashboard/reports", icon: FileText, activeMatch: "exact" },
          { id: "reports-supervision", title: "Supervisión territorial", url: "/dashboard/reports/supervision", icon: ClipboardCheck, activeMatch: "prefix" },
          { id: "reports-quarterly", title: "Informes trimestrales", url: "/dashboard/reports/quarterly", icon: CalendarDays, activeMatch: "prefix" },
          { id: "reports-annual", title: "Informes anuales", url: "/dashboard/reports/annual", icon: CalendarRange, activeMatch: "prefix" },
        ],
      },
      { id: "member-of-month", title: "Miembro del mes", url: "/dashboard/member-of-month", icon: Award, activeMatch: "prefix" },
      {
        id: "campamentos",
        title: "Camporees",
        icon: Tent,
        subItems: [
          { id: "campamentos-list-local", title: "Campo local", url: "/dashboard/campamentos", icon: Tent, activeMatch: "exact" },
          { id: "campamentos-list-union", title: "Unión", url: "/dashboard/campamentos/union", icon: Landmark, activeMatch: "prefix" },
          { id: "campamentos-plantillas", title: "Plantillas", url: "/dashboard/campamentos/plantillas", icon: FileStack, activeMatch: "prefix" },
          { id: "campamentos-judges", title: "Jueces", url: "/dashboard/campamentos/jueces", icon: Scale, activeMatch: "prefix" },
          { id: "campamentos-pedidos-catalogo", title: "Catálogo pedidos", url: "/dashboard/campamentos/pedidos/catalogo", icon: ShoppingBag, activeMatch: "prefix" },
          { id: "campamentos-pedidos-bandeja", title: "Bandeja pedidos", url: "/dashboard/campamentos/pedidos/bandeja", icon: ClipboardList, activeMatch: "prefix" },
        ],
      },
      { id: "certifications-list", title: "Certificaciones", url: "/dashboard/certifications", icon: ShieldCheck, activeMatch: "prefix" },
      { id: "year-end", title: "Cierre de año", url: "/dashboard/year-end", icon: CalendarClock, activeMatch: "prefix" },
    ],
  },
  {
    id: 5,
    label: "Administración",
    items: [
      { id: "admin-catalogs", title: "Catálogos", url: CATALOGS_INDEX_PATH, icon: Layers, activeMatch: "prefix" },
      {
        id: "admin-settings",
        title: "Configuración",
        url: CONFIGURATION_INDEX_PATH,
        icon: Settings2,
        activeMatch: "prefix",
        matchPaths: CONFIGURATION_EXTRA_MATCH_PATHS,
      },
      {
        // Ids and gates of the pages behind the Configuración index are reused here.
        id: "admin-system-roles",
        title: "Roles y permisos",
        labelKey: "items.rbac",
        url: "/dashboard/configuration/roles",
        icon: Key,
        activeMatch: "prefix",
        matchPaths: [
          "/dashboard/configuration/permissions",
          "/dashboard/configuration/matrix",
          "/dashboard/rbac/user-permissions",
        ],
      },
      {
        id: "admin-system-audit",
        title: "Auditoría",
        url: "/dashboard/configuration/audit",
        icon: ScrollText,
        activeMatch: "prefix",
      },
      {
        id: "admin-system-jobs",
        title: "Sistema",
        labelKey: "sidebar.admin_system",
        url: "/dashboard/system/jobs",
        icon: Activity,
        activeMatch: "prefix",
        matchPaths: ["/dashboard/system"],
      },
    ],
  },
];
