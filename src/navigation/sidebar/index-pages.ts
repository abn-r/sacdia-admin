import {
  Activity,
  AlertCircle,
  Award,
  Banknote,
  BookOpen,
  Bell,
  Building2,
  Calendar,
  CalendarRange,
  Church,
  ClipboardList,
  DollarSign,
  FileStack,
  Globe,
  GraduationCap,
  Grid3X3,
  Key,
  Landmark,
  Layers,
  MapPin,
  Package,
  ScrollText,
  Settings2,
  ShieldCheck,
  Signpost,
  Sparkles,
  Tags,
  Trophy,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Link-index pages that replaced deep sidebar trees. The sidebar keeps a single
 * entry for each (`admin-catalogs`, `admin-settings`); every leaf that left the
 * sidebar lives here so the page, the global search and the screen catalog
 * (url + gate lookup by `id`) share one list.
 *
 * `id` is the screen-catalog / sidebar id of the destination: its gate decides
 * whether the link is shown, and its url is `url`.
 */
export interface IndexPageLink {
  id: string;
  url: string;
  /** Spanish fallback; the localised title comes from `nav` by `id`. */
  title: string;
  icon: LucideIcon;
}

export interface IndexPageSection {
  /** Key under `nav.indexes.sections`. */
  id: string;
  title: string;
  links: IndexPageLink[];
}

export const CATALOGS_INDEX_PATH = "/dashboard/catalogs";
export const CONFIGURATION_INDEX_PATH = "/dashboard/configuration";

export const CATALOGS_INDEX_SECTIONS: IndexPageSection[] = [
  {
    id: "geography",
    title: "Geografía",
    links: [
      { id: "catalogs-divisions", url: "/dashboard/catalogs/divisions", title: "Divisiones", icon: Landmark },
      { id: "catalogs-countries", url: "/dashboard/catalogs/countries", title: "Países", icon: Globe },
      { id: "catalogs-unions", url: "/dashboard/catalogs/unions", title: "Uniones", icon: Building2 },
      { id: "catalogs-local-fields", url: "/dashboard/catalogs/local-fields", title: "Campos locales", icon: MapPin },
      { id: "catalogs-districts", url: "/dashboard/catalogs/districts", title: "Distritos", icon: Signpost },
      { id: "catalogs-churches", url: "/dashboard/catalogs/churches", title: "Iglesias", icon: Church },
    ],
  },
  {
    id: "clubs",
    title: "Clubes",
    links: [
      { id: "catalogs-club-ideals", url: "/dashboard/catalogs/club-ideals", title: "Ideales", icon: Sparkles },
      { id: "catalogs-club-types", url: "/dashboard/catalogs/club-types", title: "Tipos de club", icon: Layers },
      { id: "catalogs-classes", url: "/dashboard/catalogs/classes", title: "Clases", icon: GraduationCap },
      { id: "catalogs-class-modules", url: "/dashboard/catalogs/class-modules", title: "Módulos de clase", icon: BookOpen },
      { id: "catalogs-class-sections", url: "/dashboard/catalogs/class-sections", title: "Secciones de clase", icon: Grid3X3 },
      { id: "catalogs-certifications", url: "/dashboard/catalogs/certifications", title: "Certificaciones GM", icon: ShieldCheck },
      { id: "catalogs-activity-types", url: "/dashboard/catalogs/activity-types", title: "Tipos de actividad", icon: Activity },
      { id: "catalogs-ecclesiastical-years", url: "/dashboard/catalogs/ecclesiastical-years", title: "Años eclesiásticos", icon: Calendar },
    ],
  },
  {
    id: "health",
    title: "Salud y referencia",
    links: [
      { id: "catalogs-allergies", url: "/dashboard/catalogs/allergies", title: "Alergias", icon: AlertCircle },
      { id: "catalogs-diseases", url: "/dashboard/catalogs/diseases", title: "Enfermedades", icon: AlertCircle },
      { id: "catalogs-medicines", url: "/dashboard/catalogs/medicines", title: "Medicamentos", icon: Package },
      { id: "catalogs-relationship-types", url: "/dashboard/catalogs/relationship-types", title: "Tipos de relación", icon: Users },
    ],
  },
  {
    id: "business",
    title: "Negocio",
    links: [
      { id: "catalogs-finance-categories", url: "/dashboard/catalogs/finance-categories", title: "Categorías finanzas", icon: DollarSign },
      { id: "catalogs-inventory-categories", url: "/dashboard/catalogs/inventory-categories", title: "Categorías inventario", icon: Package },
    ],
  },
  {
    id: "honors",
    title: "Especialidades",
    links: [
      { id: "catalogs-honor-categories", url: "/dashboard/catalogs/honor-categories", title: "Categorías", icon: Tags },
      { id: "catalogs-honors", url: "/dashboard/catalogs/honors", title: "Especialidades", icon: Award },
      { id: "catalogs-master-honors", url: "/dashboard/catalogs/master-honors", title: "Maestrías", icon: Trophy },
    ],
  },
  {
    id: "camporees",
    title: "Campamentos",
    links: [
      { id: "catalogs-camporee-event-types", url: "/dashboard/catalogs/camporee-event-types", title: "Tipos de evento", icon: Tags },
    ],
  },
];

export const CONFIGURATION_INDEX_SECTIONS: IndexPageSection[] = [
  {
    id: "local_field",
    title: "Campo local",
    links: [
      { id: "admin-local-field-payment-methods", url: "/dashboard/configuration/local-field/payment-methods", title: "Métodos de pago", icon: Banknote },
      { id: "admin-local-field-delivery", url: "/dashboard/configuration/local-field/delivery", title: "Entrega de materiales", icon: Package },
    ],
  },
  {
    id: "investiture_setup",
    title: "Investiduras y evidencias",
    links: [
      { id: "investiture-settings", url: "/dashboard/investiture-settings", title: "Ventana de investidura", icon: CalendarRange },
      { id: "investiture-pastors", url: "/dashboard/investiture-pastors", title: "Pastores por distrito", icon: UserCog },
      { id: "clubs-evidence-folders-templates", url: "/dashboard/clubs/evidence-folders/templates", title: "Plantillas de evidencias", icon: FileStack },
    ],
  },
  {
    id: "camporee_config",
    title: "Campamentos",
    links: [
      { id: "admin-campamentos-config-local", url: "/dashboard/campamentos/configuracion/campo-local", title: "Config. campamentos: campo local", icon: Settings2 },
      { id: "admin-campamentos-config-union", url: "/dashboard/campamentos/configuracion/union", title: "Config. campamentos: unión", icon: Settings2 },
    ],
  },
  {
    id: "evaluation",
    title: "Evaluación",
    links: [
      { id: "admin-settings-scoring-categories", url: "/dashboard/settings/scoring-categories", title: "Categorías scoring", icon: Tags },
    ],
  },
  {
    id: "system",
    title: "Sistema",
    links: [
      { id: "admin-system-variables", url: "/dashboard/configuration/variables", title: "Variables", icon: Settings2 },
      { id: "admin-system-jobs", url: "/dashboard/system/jobs", title: "Tareas y colas", icon: Activity },
      { id: "admin-system-jobs-history", url: "/dashboard/system/jobs/history", title: "Historial de ejecuciones", icon: ClipboardList },
      { id: "admin-system-achievements", url: "/dashboard/configuration/achievements", title: "Logros", icon: Trophy },
      { id: "admin-system-audit", url: "/dashboard/configuration/audit", title: "Auditoría", icon: ScrollText },
      { id: "notifications-hub", url: "/dashboard/configuration/notifications", title: "Notificaciones", icon: Bell },
    ],
  },
  {
    id: "security",
    title: "Seguridad",
    links: [
      { id: "admin-system-roles", url: "/dashboard/configuration/roles", title: "Roles", icon: Users },
      { id: "admin-system-permissions", url: "/dashboard/configuration/permissions", title: "Permisos", icon: Key },
      { id: "admin-system-matrix", url: "/dashboard/configuration/matrix", title: "Matriz de seguridad", icon: Grid3X3 },
    ],
  },
];

export function flattenIndexLinks(sections: readonly IndexPageSection[]): IndexPageLink[] {
  return sections.flatMap((section) => section.links);
}

/** Every link that lives behind an index page (used by the screen catalog and search). */
export const ALL_INDEX_LINKS: readonly IndexPageLink[] = [
  ...flattenIndexLinks(CATALOGS_INDEX_SECTIONS),
  ...flattenIndexLinks(CONFIGURATION_INDEX_SECTIONS),
];

/**
 * Page paths outside `/dashboard/catalogs/*` and `/dashboard/configuration/*`
 * whose parent in the sidebar is Catálogos / Configuración. The notifications
 * hub keeps its own sidebar entry, so it is excluded to avoid a tie.
 */
export const CONFIGURATION_EXTRA_MATCH_PATHS: string[] = flattenIndexLinks(CONFIGURATION_INDEX_SECTIONS)
  .map((link) => link.url)
  .filter((url) => !url.startsWith("/dashboard/configuration/notifications"));
