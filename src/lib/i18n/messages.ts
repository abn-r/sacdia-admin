import { normalizeAdminLocale, type AdminLocale } from "@/lib/i18n/locale";

export const MESSAGES = {
  "es-MX": {
    login_brand_subtitle: "Panel Administrativo",
    login_panel_description: "Gestiona operaciones, catalogos y permisos desde una sola consola administrativa.",
    login_panel_feature_1: "Flujos por paginas con acciones CRUD y validacion operativa.",
    login_panel_feature_2: "Control de acceso por roles para equipos administrativos.",
    login_panel_feature_3: "Interfaz preparada para UAT y despliegue progresivo.",
    login_welcome_title: "Bienvenido",
    login_welcome_description: "Inicia sesion con tu cuenta de administrador.",
    login_security_badge: "Acceso seguro",
    login_email_label: "Correo electronico",
    login_password_label: "Contrasena",
    login_password_hint: "Tu navegador puede recordar estas credenciales para futuros inicios de sesion.",
    login_submit_idle: "Iniciar sesion",
    login_submit_loading: "Verificando...",
    login_show_password: "Mostrar contrasena",
    login_hide_password: "Ocultar contrasena",
    login_access_notice: "Acceso exclusivo para usuarios autorizados del panel administrativo.",
    login_footer: "Sistema de Administracion de Clubes · Iglesia Adventista",
  },
  "es-ES": {
    login_brand_subtitle: "Panel Administrativo",
    login_panel_description: "Gestiona operaciones, catalogos y permisos desde una sola consola administrativa.",
    login_panel_feature_1: "Flujos por paginas con acciones CRUD y validacion operativa.",
    login_panel_feature_2: "Control de acceso por roles para equipos administrativos.",
    login_panel_feature_3: "Interfaz preparada para UAT y despliegue progresivo.",
    login_welcome_title: "Bienvenido",
    login_welcome_description: "Inicia sesion con tu cuenta de administrador.",
    login_security_badge: "Acceso seguro",
    login_email_label: "Correo electronico",
    login_password_label: "Contrasena",
    login_password_hint: "Tu navegador puede recordar estas credenciales para futuros inicios de sesion.",
    login_submit_idle: "Iniciar sesion",
    login_submit_loading: "Verificando...",
    login_show_password: "Mostrar contrasena",
    login_hide_password: "Ocultar contrasena",
    login_access_notice: "Acceso exclusivo para usuarios autorizados del panel administrativo.",
    login_footer: "Sistema de Administracion de Clubes · Iglesia Adventista",
  },
  "en-US": {
    login_brand_subtitle: "Admin Panel",
    login_panel_description: "Manage operations, catalogs, and permissions from a single administrative console.",
    login_panel_feature_1: "Page-based flows with CRUD actions and operational validation.",
    login_panel_feature_2: "Role-based access control for administrative teams.",
    login_panel_feature_3: "Interface prepared for UAT and progressive rollout.",
    login_welcome_title: "Welcome",
    login_welcome_description: "Sign in with your administrator account.",
    login_security_badge: "Secure access",
    login_email_label: "Email",
    login_password_label: "Password",
    login_password_hint: "Your browser can remember these credentials for future sign-ins.",
    login_submit_idle: "Sign in",
    login_submit_loading: "Verifying...",
    login_show_password: "Show password",
    login_hide_password: "Hide password",
    login_access_notice: "Access is restricted to authorized administrative users.",
    login_footer: "Club Administration System · Seventh-day Adventist Church",
  },
} as const satisfies Record<AdminLocale, Record<string, string>>;

export type MessageKey = keyof (typeof MESSAGES)["es-MX"];

export function t(locale: unknown, key: MessageKey) {
  const normalized = normalizeAdminLocale(locale);
  return MESSAGES[normalized][key] ?? MESSAGES["es-MX"][key];
}
