import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { CamporeeLeaderboard } from "@/components/camporee-scoring/camporee-leaderboard";
import type { CamporeeLeaderboard as CamporeeLeaderboardData } from "@/lib/api/camporee-scoring";
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
      percentage: 75.5,
    },
  ],
};

afterEach(() => {
  cleanup();
});

function renderLeaderboard(data: CamporeeLeaderboardData) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeLeaderboard leaderboard={data} />
    </NextIntlClientProvider>,
  );
}

describe("CamporeeLeaderboard", () => {
  it("shows ranking rows with club, section, points and percentage", () => {
    renderLeaderboard(leaderboard);

    expect(screen.getByText("Clasificación del camporee")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Halcones")).toBeInTheDocument();
    expect(screen.getByText("Conquistadores")).toBeInTheDocument();
    expect(screen.getByText("170")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("75.5%")).toBeInTheDocument();
  });

  it("shows empty state without official results", () => {
    renderLeaderboard({ scope: { type: "local", camporeeId: 1 }, rows: [] });

    expect(
      screen.getByText("Aparecerán cuando se registren puntajes oficiales."),
    ).toBeInTheDocument();
  });
});
