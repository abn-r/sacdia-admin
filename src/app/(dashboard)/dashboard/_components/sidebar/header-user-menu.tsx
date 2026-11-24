"use client";

import { useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Languages, LogOut, Palette, PanelLeft, User } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { resetAnalyticsUser } from "@/lib/analytics/posthog";
import { getAuthUserAvatar, getAuthUserDisplayName } from "@/lib/auth/display-name";
import { useAuth } from "@/lib/auth/auth-context";
import { useRoleLabel } from "@/lib/auth/role-labels";
import { ASSIGNABLE_GLOBAL_ROLE_ORDER, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { usePermissions } from "@/lib/auth/use-permissions";
import { setLocaleAction } from "@/lib/i18n/locale-actions";
import { getInitials } from "@/lib/utils";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { useSidebarInsights } from "./sidebar-insights-context";

const THEME_MODES = ["light", "dark", "system"] as const;
const LOCALE_OPTIONS = ["es", "en", "fr", "pt-BR"] as const;

type ThemeMode = (typeof THEME_MODES)[number];
type LocaleOption = (typeof LOCALE_OPTIONS)[number];

const THEME_LABEL_KEY = {
  light: "themeLight",
  dark: "themeDark",
  system: "themeSystem",
} as const satisfies Record<ThemeMode, string>;

function isThemeMode(value: string): value is ThemeMode {
  return (THEME_MODES as readonly string[]).includes(value);
}

function isLocaleOption(value: string): value is LocaleOption {
  return (LOCALE_OPTIONS as readonly string[]).includes(value);
}

/** Highest role first: super-admin, then the assignable order, then whatever comes first. */
export function pickMainRole(roles: Iterable<string>): string | null {
  const list = [...roles];
  if (list.includes(SUPER_ADMIN_ROLE)) return SUPER_ADMIN_ROLE;
  for (const candidate of ASSIGNABLE_GLOBAL_ROLE_ORDER) {
    if (list.includes(candidate)) return candidate;
  }
  return list[0] ?? null;
}

export function HeaderUserMenu() {
  const { user } = useAuth();
  const t = useTranslations("shared.shell.userMenu");
  const tLanguages = useTranslations("shared.shell.languages");
  const locale = useLocale();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const { scopeName } = useSidebarInsights();
  const { roles } = usePermissions();
  const roleLabel = useRoleLabel();
  const [, startTransition] = useTransition();
  const { themeMode, setPreference } = usePreferencesStore(
    useShallow((state) => ({
      themeMode: state.values.theme_mode,
      setPreference: state.setPreference,
    })),
  );

  if (!user) {
    return null;
  }

  const name = getAuthUserDisplayName(user);
  const avatar = getAuthUserAvatar(user);
  const mainRole = pickMainRole(roles);
  const roleName = mainRole ? roleLabel(mainRole) : "";
  const roleLine = roleName
    ? scopeName
      ? t("role", { role: roleName, scope: scopeName })
      : roleName
    : (scopeName ?? "");

  const handleLocale = (value: string) => {
    if (!isLocaleOption(value) || value === locale) return;
    startTransition(async () => {
      await setLocaleAction(value);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("trigger")}
          className="rounded-lg max-md:grid max-md:size-11 max-md:place-items-center outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-8 rounded-lg">
            <AvatarImage src={avatar || undefined} alt="" />
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-64 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 shrink-0 rounded-lg">
              <AvatarImage src={avatar || undefined} alt="" />
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 gap-0.5 leading-tight">
              <span className="truncate font-medium text-sm">{name}</span>
              <span className="truncate text-muted-foreground text-xs">{user.email}</span>
              {roleLine ? (
                <span className="truncate text-muted-foreground text-xs" title={roleLine}>
                  {roleLine}
                </span>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link prefetch={false} href={`/dashboard/users/${user.id}`}>
            <User />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette />
            {t("theme")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={themeMode}
              onValueChange={(value) => {
                if (isThemeMode(value)) setPreference("theme_mode", value);
              }}
            >
              {THEME_MODES.map((mode) => (
                <DropdownMenuRadioItem key={mode} value={mode}>
                  {t(THEME_LABEL_KEY[mode])}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages />
            {t("language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={locale} onValueChange={handleLocale}>
              {LOCALE_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {tLanguages(option)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={() => toggleSidebar()}>
          <PanelLeft />
          {t("compact")}
          <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          {/* Route handler (clears cookies + redirects), not a page: a plain anchor is intended. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/auth/logout?next=/login" onClick={() => resetAnalyticsUser()}>
            <LogOut />
            {t("logout")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
