import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../messages/es.json";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { ReportsSupervisionClient } from "./reports-supervision-client";

const BASE = {
  club_enrollment_id: "e1",
  status: "submitted",
  generated_at: null,
  submitted_at: null,
  club_type_id: 1,
  local_field: "Campo Centro",
  local_field_id: 4,
  submitter_name: null,
  member_count: null,
};

function renderClient() {
  const items = [
    { ...BASE, monthly_report_id: "r1", month: 9, year: 2026, club_name: "ACV", club_type: "Conquistadores" },
    { ...BASE, monthly_report_id: "r2", month: 8, year: 2026, club_name: "ACV", club_type: "Aventureros" },
  ];
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ReportsSupervisionClient
        initialData={{ items, total: 2, page: 1, limit: 20 } as never}
        clubTypes={[]}
        divisions={[]}
        unions={[]}
        localFields={[]}
        territoryScope={{ level: "all" }}
        searchParams={{}}
      />
    </NextIntlClientProvider>,
  );
}

describe("ReportsSupervisionClient table", () => {
  afterEach(() => cleanup());

  it("writes the period with a lowercase connector", () => {
    renderClient();

    expect(screen.getByText("Septiembre de 2026")).toBeInTheDocument();
    expect(screen.getByText("Agosto de 2026")).toBeInTheDocument();
    expect(screen.queryByText(/ De /)).not.toBeInTheDocument();
  });

  it("gives each row menu a distinct accessible name with club, type and period", () => {
    renderClient();

    expect(
      screen.getByRole("button", { name: "Acciones de ACV · Conquistadores · Septiembre de 2026" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Acciones de ACV · Aventureros · Agosto de 2026" }),
    ).toBeInTheDocument();
  });
});
