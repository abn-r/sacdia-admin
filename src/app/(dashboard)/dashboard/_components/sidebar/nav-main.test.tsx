import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import esMessages from "../../../../../../messages/es.json";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { NavGroup } from "@/navigation/sidebar/sidebar-items";

import { NavMain } from "./nav-main";
import { SidebarInsightsProvider } from "./sidebar-insights-context";

let mockPath = "/dashboard";
vi.mock("next/navigation", () => ({ usePathname: () => mockPath }));

const link = (id: string, title: string, url: string) => ({
  id,
  title,
  url,
  activeMatch: "prefix" as const,
});

const groups: NavGroup[] = [
  { id: 0, items: [link("home", "Inicio", "/dashboard")] },
  {
    id: 1,
    label: "Por atender",
    items: [
      {
        id: "requests",
        title: "Solicitudes",
        subItems: [
          { id: "requests-transfers", title: "Traslados", url: "/dashboard/requests/transfers", activeMatch: "prefix" },
        ],
      },
      link("investiture-requests", "Investiduras", "/dashboard/investiture-requests"),
    ],
  },
  {
    id: 2,
    label: "Clubes y miembros",
    items: [link("clubs", "Clubes", "/dashboard/clubs"), link("users", "Usuarios", "/dashboard/users")],
  },
  {
    id: 3,
    label: "Operación",
    items: [link("finances", "Finanzas", "/dashboard/finances"), link("payment-orders", "Órdenes de pago", "/dashboard/payment-orders")],
  },
  {
    id: 4,
    label: "Evaluación y eventos",
    items: [
      link("clubs-evidence-folders-list", "Carpetas", "/dashboard/clubs/evidence-folders"),
      link("year-end", "Cierre de año", "/dashboard/year-end"),
    ],
  },
];

function renderNav(
  items: NavGroup[] = groups,
  counts: Record<string, number> = {},
) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages as never}>
      <SidebarInsightsProvider value={{ scopeName: null, counts }}>
        <TooltipProvider>
          <SidebarProvider>
            <NavMain items={items} />
          </SidebarProvider>
        </TooltipProvider>
      </SidebarInsightsProvider>
    </NextIntlClientProvider>,
  );
}

const toggle = (label: string) =>
  screen.getByRole("button", { name: `Mostrar u ocultar ${label}` });

function clearCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

beforeEach(() => {
  mockPath = "/dashboard";
  clearCookies();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  cleanup();
  clearCookies();
});

describe("NavMain collapsible groups", () => {
  it("opens Por atender and Clubes y miembros by default and closes the rest", () => {
    renderNav();

    expect(toggle("Por atender")).toHaveAttribute("aria-expanded", "true");
    expect(toggle("Clubes y miembros")).toHaveAttribute("aria-expanded", "true");
    expect(toggle("Operación")).toHaveAttribute("aria-expanded", "false");
    expect(toggle("Evaluación y eventos")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Clubes" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Finanzas" })).not.toBeInTheDocument();
  });

  it("keeps the unlabelled Inicio group visible on any route", () => {
    mockPath = "/dashboard/finances";
    renderNav();

    expect(screen.getByRole("link", { name: "Inicio" })).toBeVisible();
  });

  it("links the toggle to its content with aria-controls", () => {
    renderNav();

    const button = toggle("Operación");
    const content = document.getElementById(button.getAttribute("aria-controls") ?? "");
    expect(content).not.toBeNull();
    expect(content).toHaveAttribute("hidden");
    fireEvent.click(button);
    expect(content).not.toHaveAttribute("hidden");
  });

  it("toggles a group and persists the choice in the sidebar_groups cookie", () => {
    renderNav();

    fireEvent.click(toggle("Operación"));
    expect(toggle("Operación")).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle("Clubes y miembros"));
    expect(toggle("Clubes y miembros")).toHaveAttribute("aria-expanded", "false");

    const raw = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("sidebar_groups="));
    expect(raw).toBeDefined();
    expect(JSON.parse(decodeURIComponent(raw!.slice("sidebar_groups=".length)))).toEqual({
      "3": true,
      "2": false,
    });
  });

  it("restores the saved choice from the cookie after mount", () => {
    document.cookie = `sidebar_groups=${encodeURIComponent(JSON.stringify({ "1": false, "4": true }))}; path=/`;
    renderNav();

    expect(toggle("Por atender")).toHaveAttribute("aria-expanded", "false");
    expect(toggle("Evaluación y eventos")).toHaveAttribute("aria-expanded", "true");
    expect(toggle("Clubes y miembros")).toHaveAttribute("aria-expanded", "true");
  });

  it("ignores a malformed cookie and falls back to the defaults", () => {
    document.cookie = "sidebar_groups=%7Bnope; path=/";
    renderNav();

    expect(toggle("Por atender")).toHaveAttribute("aria-expanded", "true");
    expect(toggle("Operación")).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the sum of the queue counts on a closed group header only", () => {
    renderNav(groups, { "clubs-evidence-folders-list": 4, "year-end": 3, "requests-transfers": 2 });

    const closed = toggle("Evaluación y eventos");
    expect(closed).toHaveTextContent("7");
    expect(closed).toHaveAccessibleDescription("7 pendientes");
    // Open group: no sum on the header, counts stay on the items.
    expect(toggle("Por atender")).not.toHaveTextContent("2");

    fireEvent.click(closed);
    expect(toggle("Evaluación y eventos")).not.toHaveTextContent("7");
  });

  it("forces open the group that contains the active route, even when saved as closed", () => {
    document.cookie = `sidebar_groups=${encodeURIComponent(JSON.stringify({ "3": false }))}; path=/`;
    mockPath = "/dashboard/payment-orders";
    renderNav();

    expect(toggle("Operación")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Órdenes de pago" })).toHaveAttribute("data-active", "true");
  });

  it("lets the user close the active group until the next navigation", () => {
    mockPath = "/dashboard/payment-orders";
    renderNav();

    fireEvent.click(toggle("Operación"));
    expect(toggle("Operación")).toHaveAttribute("aria-expanded", "false");
  });

  it("renders every group open without toggles when the user sees 6 items or fewer", () => {
    const pastor: NavGroup[] = [
      {
        id: 1,
        label: "Por atender",
        items: [
          link("investiture-requests", "Investiduras", "/dashboard/investiture-requests"),
          link("service-credentials-review", "Constancias de consejería", "/dashboard/service-credentials"),
        ],
      },
      { id: 4, label: "Evaluación y eventos", items: [link("year-end", "Cierre de año", "/dashboard/year-end")] },
    ];
    renderNav(pastor);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Por atender")).toBeVisible();
    expect(screen.getByRole("link", { name: "Cierre de año" })).toBeVisible();
  });
});
