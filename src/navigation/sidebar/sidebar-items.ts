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

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url?: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
  /** How to mark this sub-item active in the sidebar */
  activeMatch?: "exact" | "prefix" | "clubs-list" | "evidence-folders";
  /** Nested submenu entries (e.g. Carpeta de evidencias → Plantillas / Carpetas) */
  subItems?: NavSubItem[];
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
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
    id: 1,
    label: "General",
    items: [
      {
        id: "home",
        title: "Inicio",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "users",
        title: "Usuarios",
        url: "/dashboard/users",
        icon: User,
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
          {
            id: "clubs-activities",
            title: "Actividades",
            url: "/dashboard/clubs/activities",
            icon: CalendarDays,
            activeMatch: "prefix",
          },
          {
            id: "clubs-validations",
            title: "Validaciones",
            url: "/dashboard/clubs/validations",
            icon: ClipboardCheck,
            activeMatch: "prefix",
          },
          {
            id: "clubs-evidence-folders",
            title: "Carpeta de evidencias",
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
    ],
  },
  {
    id: 2,
    label: "Campamentos",
    items: [
      {
        id: "campamentos",
        title: "Campamentos",
        icon: Tent,
        subItems: [
          {
            id: "campamentos-plantillas",
            title: "Plantillas",
            url: "/dashboard/campamentos/plantillas",
            icon: FileStack,
            activeMatch: "prefix",
          },
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
            id: "campamentos-judges",
            title: "Jueces",
            url: "/dashboard/campamentos/jueces",
            icon: Scale,
            activeMatch: "prefix",
          },
          {
            id: "campamentos-config-local",
            title: "Config. campo local",
            url: "/dashboard/campamentos/configuracion/campo-local",
            icon: Settings2,
            activeMatch: "prefix",
          },
          {
            id: "campamentos-config-union",
            title: "Config. unión",
            url: "/dashboard/campamentos/configuracion/union",
            icon: Settings2,
            activeMatch: "prefix",
          },
        ],
      },
    ],
  },
  {
    id: 3,
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
        ],
      },
    ],
  },
  {
    id: 4,
    label: "Configuración",
    items: [
      {
        id: "configuration-notifications",
        title: "Notificaciones",
        icon: Bell,
        subItems: [
          {
            id: "configuration-notifications-hub",
            title: "Resumen",
            url: "/dashboard/configuration/notifications",
            icon: Bell,
            activeMatch: "exact",
          },
          {
            id: "configuration-notifications-history",
            title: "Gestión",
            url: "/dashboard/configuration/notifications/history",
            icon: Bell,
            activeMatch: "prefix",
          },
          {
            id: "configuration-notifications-categories",
            title: "Categorías",
            url: "/dashboard/configuration/notifications/categories",
            icon: Tags,
            activeMatch: "prefix",
          },
        ],
      },
      {
        id: "configuration-local-field",
        title: "Configuraciones campo local",
        icon: Building2,
        subItems: [
          {
            id: "configuration-local-field-payment-methods",
            title: "Métodos de pago",
            url: "/dashboard/configuration/local-field/payment-methods",
            icon: Banknote,
            activeMatch: "prefix",
          },
          {
            id: "configuration-local-field-delivery",
            title: "Entrega de materiales",
            url: "/dashboard/configuration/local-field/delivery",
            icon: Package,
            activeMatch: "prefix",
          },
        ],
      },
      {
        id: "configuration-geography-catalogs",
        title: "Catálogos geográficos",
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
        id: "configuration-honors-catalogs",
        title: "Especialidades",
        icon: Award,
        subItems: [
          {
            id: "catalogs-honor-categories",
            title: "Categorías de especialidades",
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
        id: "configuration-club-catalogs",
        title: "Catálogos de clubes",
        icon: Layers,
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
        id: "configuration-achievements",
        title: "Logros",
        url: "/dashboard/configuration/achievements",
        icon: Trophy,
      },
      {
        id: "configuration-variables",
        title: "Configuración del sistema",
        url: "/dashboard/configuration/variables",
        icon: Settings2,
      },
      {
        id: "configuration-permissions",
        title: "Permisos",
        url: "/dashboard/configuration/permissions",
        icon: Key,
      },
      {
        id: "configuration-roles",
        title: "Roles",
        url: "/dashboard/configuration/roles",
        icon: Users,
      },
      {
        id: "configuration-matrix",
        title: "Matriz de seguridad",
        url: "/dashboard/configuration/matrix",
        icon: Grid3X3,
      },
    ],
  },
];
