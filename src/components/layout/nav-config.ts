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
  {
    label: "Sistema",
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
        ],
      },
      {
        title: "Roles y permisos",
        url: "/dashboard/rbac",
        icon: Shield,
        permission: "permissions:read",
        children: [
          { title: "Permisos", url: "/dashboard/rbac/permissions", permission: "permissions:read" },
          { title: "Roles", url: "/dashboard/rbac/roles", permission: "roles:read" },
          { title: "Matriz", url: "/dashboard/rbac/matrix", permission: "permissions:read" },
        ],
      },
    ],
  },
  {
    label: "Operativo",
    items: [
      { title: "Clubes", url: "/dashboard/clubs", icon: Building2, permission: "clubs:read" },
      { title: "Camporees", url: "/dashboard/camporees", icon: Tent, permission: "camporees:read" },
      { title: "Clases", url: "/dashboard/classes", icon: GraduationCap, permission: "classes:read" },
      { title: "Inscripciones", url: "/dashboard/enrollments", icon: ClipboardList, permission: "classes:read" },
      { title: "Especialidades", url: "/dashboard/honors", icon: Award, permission: "honors:read" },
      { title: "Actividades", url: "/dashboard/activities", icon: Calendar, permission: "activities:read" },
      { title: "Finanzas", url: "/dashboard/finances", icon: DollarSign, permission: "finances:read" },
      { title: "Inventario", url: "/dashboard/inventory", icon: Package, permission: "inventory:read" },
      { title: "Certificaciones", url: "/dashboard/certifications", icon: ShieldCheck, permission: "certifications:read" },
      { title: "Seguros", url: "/dashboard/insurance", icon: Heart, permission: "insurance:read" },
      {
        title: "Investiduras",
        url: "/dashboard/investiture",
        icon: Star,
        permission: "investiture:read",
        children: [
          { title: "Pendientes", url: "/dashboard/investiture", permission: "investiture:read" },
          { title: "Configuración", url: "/dashboard/investiture/config", permission: "investiture:read" },
        ],
      },
    ],
  },
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
      { title: "Folders", url: "/dashboard/folders", icon: FolderOpen, permission: "folders:read" },
    ],
  },
];
