import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CamporeeLeaderboard } from "@/components/camporee-scoring/camporee-leaderboard";
import type { CamporeeLeaderboard as CamporeeLeaderboardData } from "@/lib/api/camporee-scoring";

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

describe("CamporeeLeaderboard", () => {
  it("shows ranking rows with club, section, points and percentage", () => {
    render(<CamporeeLeaderboard leaderboard={leaderboard} />);

    expect(screen.getByText("Leaderboard del camporee")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Halcones")).toBeInTheDocument();
    expect(screen.getByText("Conquistadores")).toBeInTheDocument();
    expect(screen.getByText("170")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("75.5%")).toBeInTheDocument();
  });

  it("shows empty state without official results", () => {
    render(<CamporeeLeaderboard leaderboard={{ scope: { type: "local", camporeeId: 1 }, rows: [] }} />);

    expect(
      screen.getByText("Todavía no hay resultados oficiales para mostrar."),
    ).toBeInTheDocument();
  });
});
