/**
 * Sidebar primitive — SidebarTrigger srLabel tests
 *
 * `SidebarTrigger` renders a ghost icon button with a sr-only
 * `<span>` whose text comes from `useTranslations("shared.uiPrimitives")`
 * (`"toggleSidebar"` key).
 *
 * It also uses:
 * - `useSidebar()` → must be inside `<SidebarProvider>`
 * - `useIsMobile()` → uses `window.matchMedia` (mocked below)
 *
 * `SidebarRail` also reads `t("toggleSidebar")` and sets it as
 * `aria-label` — tested here as well.
 *
 * Tests verify:
 * 1. SidebarTrigger renders sr-only text from the active locale.
 * 2. Different locales produce the correct translated sr-only text.
 * 3. Clicking the trigger calls `toggleSidebar` (state changes).
 * 4. An additional `onClick` prop is forwarded alongside toggleSidebar.
 * 5. SidebarRail aria-label reflects the active locale.
 */

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import { SidebarProvider, SidebarTrigger, SidebarRail, Sidebar, SidebarContent } from "./sidebar";

// ---------------------------------------------------------------------------
// window.matchMedia mock — jsdom does not implement it
// ---------------------------------------------------------------------------

const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: false, // desktop: window.innerWidth >= 768 → not mobile
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: matchMediaMock,
  });
});

// RTL globals: false → auto-cleanup not registered; do it explicitly.
afterEach(() => cleanup());

afterAll(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const messagesEn = {
  shared: {
    uiPrimitives: {
      close: "Close",
      toggleSidebar: "Toggle Sidebar",
    },
  },
};

const messagesEs = {
  shared: {
    uiPrimitives: {
      close: "Cerrar",
      toggleSidebar: "Alternar barra lateral",
    },
  },
};

const messagesFr = {
  shared: {
    uiPrimitives: {
      close: "Fermer",
      toggleSidebar: "Basculer la barre latérale",
    },
  },
};

const messagesPtBr = {
  shared: {
    uiPrimitives: {
      close: "Fechar",
      toggleSidebar: "Alternar barra lateral",
    },
  },
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderTrigger(
  locale: string,
  msgs: Record<string, unknown>,
  overrides?: { onClick?: React.MouseEventHandler<HTMLButtonElement> },
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={msgs}>
      <SidebarProvider>
        <Sidebar>
          <SidebarContent />
        </Sidebar>
        <SidebarTrigger onClick={overrides?.onClick} />
      </SidebarProvider>
    </NextIntlClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests — SidebarTrigger sr-only label
// ---------------------------------------------------------------------------

describe("SidebarTrigger — sr-only toggleSidebar label", () => {
  it("en locale — renders 'Toggle Sidebar' sr-only text", () => {
    renderTrigger("en", messagesEn);
    expect(screen.getByText("Toggle Sidebar")).toBeInTheDocument();
  });

  it("es locale — renders 'Alternar barra lateral' sr-only text", () => {
    renderTrigger("es", messagesEs);
    expect(screen.getByText("Alternar barra lateral")).toBeInTheDocument();
  });

  it("fr locale — renders 'Basculer la barre latérale' sr-only text", () => {
    renderTrigger("fr", messagesFr);
    expect(screen.getByText("Basculer la barre latérale")).toBeInTheDocument();
  });

  it("pt-BR locale — renders 'Alternar barra lateral' sr-only text", () => {
    renderTrigger("pt-BR", messagesPtBr);
    // Both SidebarTrigger (sr-only span) and possibly SidebarRail share the
    // same translation. getAllByText is safe here — at least one match required.
    const matches = screen.getAllByText("Alternar barra lateral");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    matches.forEach((el) => expect(el).toBeInTheDocument());
  });

  it("clicking trigger toggles sidebar state (data-state changes)", () => {
    renderTrigger("en", messagesEn);
    // Before click: sidebar starts expanded (defaultOpen=true in SidebarProvider)
    const sidebarEl = document.querySelector("[data-slot='sidebar']");
    expect(sidebarEl).toHaveAttribute("data-state", "expanded");

    // Find the trigger button and click it
    const triggerBtn = document.querySelector("[data-slot='sidebar-trigger']");
    expect(triggerBtn).toBeInTheDocument();
    fireEvent.click(triggerBtn!);

    // After click: state should be collapsed
    expect(sidebarEl).toHaveAttribute("data-state", "collapsed");
  });

  it("additional onClick prop is called when trigger is clicked", () => {
    const onClick = vi.fn();
    renderTrigger("en", messagesEn, { onClick });
    const triggerBtn = document.querySelector("[data-slot='sidebar-trigger']");
    fireEvent.click(triggerBtn!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("trigger button has data-sidebar='trigger'", () => {
    renderTrigger("en", messagesEn);
    const triggerBtn = document.querySelector("[data-sidebar='trigger']");
    expect(triggerBtn).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests — SidebarRail aria-label
// ---------------------------------------------------------------------------

describe("SidebarRail — toggleSidebar aria-label", () => {
  function renderRail(locale: string, msgs: Record<string, unknown>) {
    return render(
      <NextIntlClientProvider locale={locale} messages={msgs}>
        <SidebarProvider>
          <Sidebar>
            <SidebarContent />
            <SidebarRail />
          </Sidebar>
        </SidebarProvider>
      </NextIntlClientProvider>,
    );
  }

  it("en locale — SidebarRail has aria-label='Toggle Sidebar'", () => {
    renderRail("en", messagesEn);
    const rail = document.querySelector("[data-slot='sidebar-rail']");
    expect(rail).toHaveAttribute("aria-label", "Toggle Sidebar");
  });

  it("es locale — SidebarRail has aria-label='Alternar barra lateral'", () => {
    renderRail("es", messagesEs);
    const rail = document.querySelector("[data-slot='sidebar-rail']");
    expect(rail).toHaveAttribute("aria-label", "Alternar barra lateral");
  });
});
