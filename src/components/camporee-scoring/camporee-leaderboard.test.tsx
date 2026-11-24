import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { CamporeeLeaderboard } from "@/components/camporee-scoring/camporee-leaderboard";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
  CamporeeLeaderboard as CamporeeLeaderboardData,
  CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";
import messages from "../../../messages/es.json";

const leaderboard: CamporeeLeaderboardData = {
  scope: { type: "local", camporeeId: 1 },
  rows: [
    {
      rank: 1,
      camporee_club_id: 5,
      club_section_id: 99,
      club_name: "Halcones",
      section_name: "Conquistadores",
      total_awarded_points: 170,
      total_max_points: 200,
      scored_events_count: 2,
      percentage: 85,
    },
    {
      rank: 2,
      camporee_club_id: 6,
      club_section_id: 100,
      club_name: "Leones",
      section_name: "Aventureros",
      total_awarded_points: 75.5,
      total_max_points: 100,
      scored_events_count: 1,
      percentage: 75.5,
    },
  ],
};

afterEach(() => {
  cleanup();
});

function renderLeaderboard(
  data: CamporeeLeaderboardData,
  context: Partial<React.ComponentProps<typeof CamporeeLeaderboard>> = {},
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeLeaderboard leaderboard={data} {...context} />
    </NextIntlClientProvider>,
  );
}

describe("CamporeeLeaderboard", () => {
  it("shows each section with club, points of the maximum and percentage, without positions", () => {
    renderLeaderboard(leaderboard);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Halcones")).toBeInTheDocument();
    expect(within(table).getByText("Conquistadores")).toBeInTheDocument();
    expect(within(table).getByText("170 de 200")).toBeInTheDocument();
    expect(within(table).getByText("85%")).toBeInTheDocument();
    expect(within(table).getByText("75.5%")).toBeInTheDocument();
    // No rank badges and no ranking/classification wording.
    expect(screen.queryByText("#1")).toBeNull();
    expect(screen.queryByText(/clasificaci[oó]n|ranking/i)).toBeNull();
    expect(within(table).queryByRole("columnheader", { name: /pos/i })).toBeNull();
  });

  it("shows empty state without official results", () => {
    renderLeaderboard({ scope: { type: "local", camporeeId: 1 }, rows: [] });

    expect(
      screen.getByText("Aparecerán cuando se registren puntajes oficiales."),
    ).toBeInTheDocument();
  });

  it("explains how the order is built", () => {
    renderLeaderboard(leaderboard);

    expect(screen.getByText(/Ordenado por el porcentaje de puntos/)).toBeInTheDocument();
  });

  describe("coverage", () => {
    const events = [1, 2, 3].map(
      (id) => ({ camporee_event_id: id, scoring_enabled: true }) as BackendCamporeeEvent,
    );
    const target = (sectionId: number): CamporeeScoringTarget => ({
      camporee_club_id: 1,
      club_section_id: sectionId,
      club_name: null,
      section_name: null,
      status: "approved",
    });
    const targetsByEvent = {
      1: [target(99), target(100)],
      2: [target(99), target(100)],
      3: [target(99)],
    };

    it("shows how many scorable events each section has been scored on", () => {
      renderLeaderboard(leaderboard, { events, targetsByEvent });

      const table = screen.getByRole("table");
      expect(within(table).getByRole("columnheader", { name: "Eventos calificados" })).toBeInTheDocument();
      expect(within(table).getByText("2 de 3 eventos calificados")).toBeInTheDocument();
      expect(within(table).getByText("1 de 2 eventos calificados")).toBeInTheDocument();
    });

    it("marks only the sections that still miss scorable events", () => {
      renderLeaderboard(leaderboard, { events, targetsByEvent });

      const table = screen.getByRole("table");
      // Both sections are one event short (2 of 3 and 1 of 2).
      expect(within(table).getAllByText("Falta 1 evento")).toHaveLength(2);
    });

    it("uses the backend count even when event max points differ", () => {
      const uneven: CamporeeLeaderboardData = {
        ...leaderboard,
        rows: [{ ...leaderboard.rows[0]!, total_max_points: 150, scored_events_count: 3 }],
      };
      renderLeaderboard(uneven, { events, targetsByEvent });

      const table = screen.getByRole("table");
      expect(within(table).getByText("3 de 3 eventos calificados")).toBeInTheDocument();
      expect(within(table).queryByText(/Falta/)).toBeNull();
    });

    it("hides the coverage column without event context", () => {
      renderLeaderboard(leaderboard);

      expect(screen.queryByRole("columnheader", { name: "Eventos calificados" })).toBeNull();
    });
  });
});
