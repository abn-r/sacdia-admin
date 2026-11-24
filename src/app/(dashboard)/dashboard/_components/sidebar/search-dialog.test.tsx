import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../../../messages/es.json";
import { RECENT_PAGES_KEY } from "@/lib/search/recent-pages";

const push = vi.fn();
let allowedPaths: string[] = [];
let counts: Record<string, number> = {};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => "/dashboard",
}));
vi.mock("@/lib/auth/auth-context", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/lib/auth/require-page-access", () => ({
  canAccessDashboardPath: (_user: unknown, path: string) => allowedPaths.includes(path),
}));
vi.mock("@/lib/auth/screen-catalog", () => ({ canViewScreen: () => false }));
vi.mock("@/lib/auth/screen-catalog/use-screen-access", () => ({
  useScreenAccess: () => ({ subject: {} }),
}));
vi.mock("@/lib/auth/use-permissions", () => ({ usePermissions: () => ({ isPastorOnly: false }) }));
vi.mock("./sidebar-insights-context", () => ({
  useSidebarInsights: () => ({ scopeName: null, counts }),
}));
vi.mock("@/navigation/sidebar/use-sidebar-items", () => ({
  useSidebarItems: () => [
    {
      id: 1,
      label: "Pendientes",
      items: [
        { id: "requests-assignments", title: "Solicitudes de rol", url: "/dashboard/requests/assignments" },
      ],
    },
    {
      id: 2,
      items: [{ id: "loose", title: "Suelta", url: "/dashboard/loose" }],
    },
  ],
}));

import { SearchDialog } from "./search-dialog";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
Element.prototype.scrollIntoView = () => {};
import { openGlobalSearch } from "@/lib/search/open-search";

function renderDialog() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SearchDialog />
    </NextIntlClientProvider>,
  );
}

describe("SearchDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    allowedPaths = [];
    counts = {};
  });
  afterEach(() => cleanup());

  it("opens from the sacdia:open-search event", async () => {
    renderDialog();
    expect(screen.queryByPlaceholderText("Buscar páginas o acciones")).not.toBeInTheDocument();
    act(() => openGlobalSearch());
    expect(await screen.findByPlaceholderText("Buscar páginas o acciones")).toBeInTheDocument();
    expect(screen.getByText("↑↓ moverse")).toBeInTheDocument();
  });

  it("puts ungrouped items under General, never Other", async () => {
    const user = userEvent.setup();
    renderDialog();
    act(() => openGlobalSearch());
    await user.type(screen.getByPlaceholderText("Buscar páginas o acciones"), "Suelta");
    expect(await screen.findByText("General")).toBeInTheDocument();
    expect(screen.queryByText("Other")).not.toBeInTheDocument();
  });

  it("shows only the actions the user can access", async () => {
    allowedPaths = ["/dashboard/users/new"];
    renderDialog();
    act(() => openGlobalSearch());
    expect(await screen.findByText("Agregar usuario")).toBeInTheDocument();
    expect(screen.queryByText("Nuevo club")).not.toBeInTheDocument();
    expect(screen.queryByText("Nueva actividad")).not.toBeInTheDocument();
  });

  it("lists recents that are still accessible and drops stale ones", async () => {
    window.localStorage.setItem(
      RECENT_PAGES_KEY,
      JSON.stringify([
        { href: "/dashboard/loose", label: "Suelta" },
        { href: "/dashboard/gone", label: "Ya no existe" },
      ]),
    );
    renderDialog();
    act(() => openGlobalSearch());
    expect(await screen.findByText("Recientes")).toBeInTheDocument();
    expect(screen.getByText("Suelta")).toBeInTheDocument();
    expect(screen.queryByText("Ya no existe")).not.toBeInTheDocument();
  });

  it("stores a page in recents when it is opened from the search", async () => {
    const user = userEvent.setup();
    renderDialog();
    act(() => openGlobalSearch());
    await user.type(await screen.findByPlaceholderText("Buscar páginas o acciones"), "Suelta");
    await user.click(await screen.findByText("Suelta"));
    expect(push).toHaveBeenCalledWith("/dashboard/loose");
    expect(JSON.parse(window.localStorage.getItem(RECENT_PAGES_KEY) ?? "[]")).toEqual([
      { href: "/dashboard/loose", label: "Suelta" },
    ]);
  });

  it("shows queues with a count under Por atender", async () => {
    counts = { "requests-assignments": 4 };
    renderDialog();
    act(() => openGlobalSearch());
    expect(await screen.findByText("Por atender")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
