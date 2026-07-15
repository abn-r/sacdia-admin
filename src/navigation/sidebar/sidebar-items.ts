import {
  Award,
  BookOpen,
  Building2,
  Banknote,
  Bell,
  CalendarDays,
  ClipboardCheck,
  FileStack,
  FolderOpen,
  Globe,
  GraduationCap,
  Grid3X3,
  Key,
  Landmark,
  LayoutDashboard,
  Layers,
  MapPin,
  Package,
  Scale,
  Settings2,
  ShoppingBag,
  Signpost,
  Sparkles,
  Tags,
  Tent,
  Trophy,
  Church,
  User,
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
  activeMatch?: "exact" | "prefix";
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
    label: "Mi operación",
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
        icon: Building2,
        subItems: [
          {
            id: "clubs-list",
            title: "Listado",
            url: "/dashboard/clubs",
            icon: Building2,
            activeMatch: "clubs-list",
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
            title: "Investiduras",
            url: "/dashboard/clubs/validations",
            icon: ClipboardCheck,
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
            title: "Config. de ranking",
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
    ],
  },
  {
    id: 2,
    label: "Eventos",
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
    id: 3,
    label: "Logística",
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
        ],
      },
    ],
  },
  {
    id: 4,
    label: "Comunicación",
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
    id: 5,
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
