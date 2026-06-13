import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/clubs/actions", () => ({
  createClubSectionAction: vi.fn(),
  updateClubSectionAction: vi.fn(),
}));

vi.mock("@/components/member-of-month/member-of-month-card", () => ({
  MemberOfMonthCard: () => <div data-testid="member-of-month-card" />,
}));

vi.mock("@/components/clubs/section-director-succession-card", () => ({
  SectionDirectorSuccessionCard: () => <div data-testid="director-succession-card" />,
}));

vi.mock("@/lib/format-locale", () => ({
  useFormatCurrency: () => (value: number) => `$${value}`,
}));

import { ClubSectionsPanel } from "@/components/clubs/club-sections-panel";

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ClubSectionsPanel
        clubId={10}
        clubTypes={[
          { club_type_id: 1, name: "Aventureros" },
          { club_type_id: 2, name: "Conquistadores" },
        ]}
        sections={[
          {
            club_section_id: 7,
            club_type_id: 2,
            club_type: { name: "Conquistadores" },
            name: "Conquistadores Central",
            active: true,
            souls_target: 12,
            fee: 150,
            members_count: 8,
          },
        ]}
      />
    </NextIntlClientProvider>,
  );
}

describe("ClubSectionsPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows add controls for missing club types and management controls for existing sections", () => {
    renderPanel();

    expect(screen.getByText("Aventureros")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /agregar/i })).toBeInTheDocument();

    expect(screen.getByText("Conquistadores Central")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desactivar/i })).toBeInTheDocument();
  });
});
