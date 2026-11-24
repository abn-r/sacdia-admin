import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../../../messages/es.json";

const setPreference = vi.fn();
const toggleSidebar = vi.fn();
const refresh = vi.fn();
const setLocaleAction = vi.fn<(locale: string) => Promise<boolean>>(async () => true);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
  usePathname: () => "/dashboard",
}));
vi.mock("@/lib/i18n/locale-actions", () => ({
  setLocaleAction: (locale: string) => setLocaleAction(locale),
}));
vi.mock("@/stores/preferences/preferences-provider", () => ({
  usePreferencesStore: (selector: (state: unknown) => unknown) =>
    selector({ values: { theme_mode: "light" }, setPreference }),
}));
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ toggleSidebar }),
}));
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "ana@example.com", name: "Ana", paternal_last_name: "Pérez" },
  }),
}));
vi.mock("@/lib/auth/use-permissions", () => ({
  usePermissions: () => ({ roles: new Set(["director-lf", "user"]) }),
}));
vi.mock("./sidebar-insights-context", () => ({
  useSidebarInsights: () => ({ scopeName: "Asociación Norte", counts: {} }),
}));
vi.mock("@/lib/analytics/posthog", () => ({ resetAnalyticsUser: vi.fn() }));

import { HeaderUserMenu, pickMainRole } from "./header-user-menu";

function renderMenu() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <HeaderUserMenu />
    </NextIntlClientProvider>,
  );
}

async function openMenu() {
  const user = userEvent.setup();
  renderMenu();
  await user.click(screen.getByRole("button", { name: "Menú de usuario" }));
  return user;
}

describe("HeaderUserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it("shows name, email and the role · scope line", async () => {
    await openMenu();
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText(/ · Asociación Norte$/)).toBeInTheDocument();
  });

  it("links to the current user's profile and keeps logout", async () => {
    await openMenu();
    expect(await screen.findByRole("menuitem", { name: "Mi perfil" })).toHaveAttribute(
      "href",
      "/dashboard/users/user-1",
    );
    expect(screen.getByRole("menuitem", { name: "Cerrar sesión" })).toHaveAttribute(
      "href",
      "/api/auth/logout?next=/login",
    );
  });

  it("sets the theme preference from the radio items", async () => {
    const user = await openMenu();
    const trigger = await screen.findByRole("menuitem", { name: "Tema" });
    trigger.focus();
    await user.keyboard("{ArrowRight}");
    await user.click(await screen.findByRole("menuitemradio", { name: "Oscuro" }));
    expect(setPreference).toHaveBeenCalledWith("theme_mode", "dark");
  });

  it("calls the locale action and refreshes when picking a language", async () => {
    const user = await openMenu();
    const trigger = await screen.findByRole("menuitem", { name: "Idioma" });
    trigger.focus();
    await user.keyboard("{ArrowRight}");
    await user.click(await screen.findByRole("menuitemradio", { name: "English" }));
    expect(setLocaleAction).toHaveBeenCalledWith("en");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("toggles the sidebar from the compact item", async () => {
    const user = await openMenu();
    await user.click(await screen.findByRole("menuitem", { name: /Menú lateral compacto/ }));
    expect(toggleSidebar).toHaveBeenCalled();
  });
});

describe("pickMainRole", () => {
  it("prefers super-admin, then the assignable order", () => {
    expect(pickMainRole(["user", "super-admin"])).toBe("super-admin");
    expect(pickMainRole(["user", "director-lf"])).toBe("director-lf");
    expect(pickMainRole(["custom-role"])).toBe("custom-role");
    expect(pickMainRole([])).toBeNull();
  });
});
