import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../messages/es.json";
import type { AdminMomItem } from "@/lib/api/member-of-month";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/member-of-month",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/auth/auth-context", () => ({ useAuth: () => ({ user: {} }) }));
vi.mock("@/lib/member-of-month/evaluate-access", () => ({ canEvaluateMemberOfMonth: () => true }));

const mockEvaluate = vi.fn();
vi.mock("@/lib/api/member-of-month", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/member-of-month")>()),
  evaluateMemberOfMonth: (...args: unknown[]) => mockEvaluate(...args),
}));

import { MemberOfMonthSupervisionClient } from "./member-of-month-supervision-client";

const item = (over: Partial<AdminMomItem>): AdminMomItem => ({
  member_of_month_id: 1,
  user_id: "u1",
  user_name: "Camila Ibarra",
  user_image: null,
  club_section_id: 10,
  section_name: "Conquistadores",
  club_type: "Conquistadores",
  club_id: 3,
  club_name: "Club Orión",
  local_field: null,
  local_field_id: null,
  month: 10,
  year: 2026,
  total_points: 30,
  notified: true,
  created_at: "2026-11-01T00:00:00Z",
  ...over,
});

const ITEMS = [
  item({}),
  item({ member_of_month_id: 2, user_name: "Iker Montes", club_section_id: 11, section_name: "Aventureros", total_points: 28, notified: false }),
  item({ member_of_month_id: 3, user_name: "Renata Flores", club_section_id: 11, section_name: "Aventureros", total_points: 28, notified: false }),
];

function renderClient(items = ITEMS) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <MemberOfMonthSupervisionClient
        initialData={{ items, total: items.length, page: 1, limit: 20 }}
        clubTypes={[{ club_type_id: 1, name: "Conquistadores" }]}
        localFields={[{ local_field_id: 4, name: "Asociación Centro", union_id: 2, active: true }]}
        territoryScope={{ level: "all" }}
        searchParams={{}}
      />
    </NextIntlClientProvider>,
  );
}

describe("MemberOfMonthSupervisionClient", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("labels every filter", () => {
    renderClient();

    for (const name of ["Tipo de club", "Mes", "Año", "Aviso"]) {
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
    }
  });

  it("shows one row per section and the tie in the same row", () => {
    renderClient();

    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 sections
    expect(screen.getByText(/Iker Montes y Renata Flores/)).toBeInTheDocument();
    expect(screen.getByText(/empate/)).toBeInTheDocument();
  });

  it("marks only «Sin avisar» and drops the club type column", () => {
    renderClient();

    expect(screen.getAllByText("Sin avisar")).toHaveLength(1);
    expect(screen.queryByText("Avisado")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Tipo de club" })).toBeNull();
  });

  it("confirms what gets replaced before evaluating again", async () => {
    mockEvaluate.mockResolvedValue(undefined);
    renderClient();

    await userEvent.click(screen.getByRole("button", { name: /Acciones de Club Orión · Aventureros/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Volver a evaluar…" }));

    expect(await screen.findByText(/reemplaza a Iker Montes y Renata Flores/)).toBeInTheDocument();
    expect(mockEvaluate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Volver a evaluar" }));
    await waitFor(() => expect(mockEvaluate).toHaveBeenCalledWith(3, 11, { month: 10, year: 2026 }));
  });
});
