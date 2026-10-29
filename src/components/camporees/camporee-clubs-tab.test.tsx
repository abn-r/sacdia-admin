import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { CamporeeClubsTab } from "@/components/camporees/camporee-clubs-tab";
import es from "../../../messages/es.json";

vi.mock("@/lib/api/camporees", () => ({
  getEnrolledClubs: vi.fn(),
  getUnionEnrolledClubs: vi.fn(),
  cancelClubEnrollment: vi.fn(),
  cancelUnionClubEnrollment: vi.fn(),
  approveCamporeeClub: vi.fn(),
  rejectCamporeeClub: vi.fn(),
  approveUnionCamporeeClub: vi.fn(),
  rejectUnionCamporeeClub: vi.fn(),
}));

vi.mock("@/components/camporees/enroll-club-dialog", () => ({
  EnrollClubDialog: () => null,
}));

afterEach(() => {
  cleanup();
});

describe("CamporeeClubsTab", () => {
  it("shows an empty state that points directors to the app when no clubs are enrolled", () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <CamporeeClubsTab camporeeId={1} initialClubs={[]} />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Aún no hay clubes inscritos" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Los directores inscriben a sus clubes desde la app."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inscribir club" })).toBeInTheDocument();
  });
});
