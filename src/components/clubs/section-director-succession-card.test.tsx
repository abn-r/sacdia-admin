import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockListMembers = vi.fn();
const mockListYears = vi.fn();
const mockListAdminUsers = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/auth/use-permissions", () => ({
  usePermissions: () => ({
    roles: ["admin"],
  }),
}));

vi.mock("@/lib/api/clubs", () => ({
  listNormalizedClubSectionMembers: (...args: unknown[]) => mockListMembers(...args),
}));

vi.mock("@/lib/api/catalogs", () => ({
  listEcclesiasticalYears: (...args: unknown[]) => mockListYears(...args),
}));

vi.mock("@/lib/api/admin-users", () => ({
  listAdminUsers: (...args: unknown[]) => mockListAdminUsers(...args),
}));

vi.mock("@/lib/clubs/actions", () => ({
  assignInitialClubSectionDirectorAction: vi.fn(),
  succeedClubSectionDirectorAction: vi.fn(),
}));

import { SectionDirectorSuccessionCard } from "@/components/clubs/section-director-succession-card";

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SectionDirectorSuccessionCard
        clubId={10}
        sectionId={7}
        sectionName="Conquistadores"
      />
    </QueryClientProvider>,
  );
}

describe("SectionDirectorSuccessionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListYears.mockResolvedValue([
      {
        ecclesiastical_year_id: 2026,
        name: "2026",
        active: true,
        start_date: "2026-01-01",
      },
    ]);
    mockListAdminUsers.mockResolvedValue({
      items: [
        {
          user_id: "00000000-0000-0000-0000-000000000010",
          name: "Ana",
          paternal_last_name: "García",
          email: "ana@example.com",
          active: true,
        },
      ],
    });
  });

  afterEach(() => cleanup());

  it("renders initial director assignment when the section has no active director", async () => {
    mockListMembers.mockResolvedValue([]);

    renderCard();

    await waitFor(() => {
      expect(screen.getByText("Asignar director de sección")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Sin director activo")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /asignar director/i })).toBeInTheDocument();
    });
  });

  it("renders annual succession when the section already has an active director", async () => {
    mockListMembers.mockResolvedValue([
      {
        assignment_id: "00000000-0000-0000-0000-000000000001",
        user_id: "00000000-0000-0000-0000-000000000002",
        name: "Director Actual",
        role: "director",
      },
      {
        assignment_id: "00000000-0000-0000-0000-000000000003",
        user_id: "00000000-0000-0000-0000-000000000004",
        name: "Nueva Directora",
        role: "member",
      },
    ]);

    renderCard();

    await waitFor(() => {
      expect(screen.getByText("Sucesión anual de director")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Director Actual")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cambiar director/i })).toBeInTheDocument();
    });
  });
});
