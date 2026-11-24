import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import { ClubContextBar, ClubPickList } from "./club-context-bar";
import type { ClubContextClub } from "@/lib/club-context/types";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/dashboard/finances",
  useSearchParams: () => new URLSearchParams(search),
}));

const section = (id: number, name: string) => ({ club_section_id: id, club_type_id: id, name, club_type: { name } });

const CLUBS: ClubContextClub[] = [
  { club_id: 1, name: "Club Orión", group: "Norte", sections: [section(11, "Conquistadores"), section(12, "Aventureros")] },
  { club_id: 2, name: "Club Cedros", group: "Sur", sections: [section(21, "Conquistadores")] },
];

function renderBar(props: Partial<React.ComponentProps<typeof ClubContextBar>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ClubContextBar clubs={CLUBS} clubId={null} sectionId={null} {...props} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  search = "";
  document.cookie = "sacdia_admin_scope=; path=/; max-age=0";
});
afterEach(cleanup);

describe("ClubContextBar", () => {
  it("says which club and section you are in", () => {
    renderBar({ clubId: 1, sectionId: 12 });
    const pill = screen.getByRole("button", { name: /cambiar/i });
    expect(pill).toHaveTextContent("Club Orión");
    expect(pill).toHaveTextContent("Aventureros");
  });

  it("shows «Todos los clubes» when no club is chosen", () => {
    renderBar();
    expect(screen.getByRole("button", { name: /cambiar/i })).toHaveTextContent("Todos los clubes");
  });

  it("opens a club + section search and writes both to the URL and the cookie", async () => {
    const user = userEvent.setup();
    renderBar();

    await user.click(screen.getByRole("button", { name: /cambiar/i }));
    await user.click(await screen.findByText("Aventureros"));

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/dashboard/finances?club=1&section=12", { scroll: false });
    expect(decodeURIComponent(document.cookie)).toContain('"club":"1"');
    expect(decodeURIComponent(document.cookie)).toContain('"section":"12"');
  });

  it("offers «whole club» only where the module accepts all sections", async () => {
    const user = userEvent.setup();
    renderBar({ allowAllSections: true });

    await user.click(screen.getByRole("button", { name: /cambiar/i }));
    expect(await screen.findByText("Todas las secciones")).toBeInTheDocument();
  });

  it("a club with one section travels with it", async () => {
    const user = userEvent.setup();
    renderBar({ allowAllSections: true });

    await user.click(screen.getByRole("button", { name: /cambiar/i }));
    await user.click(await screen.findByText("Club Cedros"));

    expect(replace).toHaveBeenCalledWith("/dashboard/finances?club=2&section=21", { scroll: false });
  });

  it("picking «Todos los clubes» clears the choice", async () => {
    const user = userEvent.setup();
    search = "club=1&section=11";
    renderBar({ clubId: 1, sectionId: 11 });

    await user.click(screen.getByRole("button", { name: /cambiar/i }));
    await user.click(await screen.findByText("Todos los clubes"));

    expect(replace).toHaveBeenCalledWith("/dashboard/finances", { scroll: false });
  });

  it("club roles get no picker, only their club", () => {
    renderBar({ clubs: [CLUBS[1]!], clubId: 2, sectionId: 21, fixed: true });

    expect(screen.queryByRole("button", { name: /cambiar/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Club actual: Club Cedros")).toHaveTextContent("Conquistadores");
  });

  it("restores the remembered club into the URL when the page opens without one", () => {
    document.cookie = `sacdia_admin_scope=${encodeURIComponent(JSON.stringify({ club: "2", section: "21" }))}; path=/`;
    renderBar();

    expect(replace).toHaveBeenCalledWith("/dashboard/finances?club=2&section=21", { scroll: false });
  });
});

describe("ClubPickList", () => {
  it("lists the clubs of the territory with a way into each one", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <ClubPickList clubs={CLUBS} />
      </NextIntlClientProvider>,
    );

    const links = screen.getAllByRole("link", { name: "Club Cedros" });
    expect(links[0]).toHaveAttribute("href", "/dashboard/finances?club=2&section=21");
    expect(screen.getAllByRole("link", { name: /Club Orión/ })[0]).toHaveAttribute("href", "/dashboard/finances?club=1");
  });
});
