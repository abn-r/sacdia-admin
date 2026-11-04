import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../messages/es.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/clubs/actions", () => ({
  designateClubSectionDirectorAction: vi.fn(),
}));

vi.mock("@/lib/clubs/detail-actions", () => ({
  createClubSectionAction: vi.fn(),
  toggleClubSectionActiveAction: vi.fn(),
}));

import { DesignationBlock } from "@/components/clubs/detail/sections-tab";

function renderBlock(extra: Record<string, unknown> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DesignationBlock
        clubId={7}
        sectionId={101}
        nextYearId={2027}
        existingUserId={null}
        successionId={null}
        version={null}
        members={[{ user_id: "u1", name: "Luis" }]}
        {...extra}
      />
    </NextIntlClientProvider>,
  );
}

describe("DesignationBlock block warning", () => {
  afterEach(() => cleanup());

  it("shows cause and last attempt date when block_code exists", () => {
    renderBlock({
      blockCode: "CLUB_ROLE_GUIDE_MAJOR_REQUIRED",
      lastAttemptAt: "2026-11-02T15:00:00.000Z",
    });
    expect(screen.getByRole("status").textContent).toContain("no es Guía Mayor");
    expect(screen.getByRole("status").textContent).toContain("Último intento:");
    expect(screen.getByRole("status").textContent).toMatch(/2026/);
    expect(
      screen.getByText("Se designa entre el 1 de octubre y el 31 de diciembre."),
    ).toBeTruthy();
  });

  it("falls back to the raw code for unknown causes", () => {
    renderBlock({ blockCode: "SOMETHING_NEW" });
    expect(screen.getByRole("status").textContent).toContain("SOMETHING_NEW");
  });

  it("shows no warning without block_code", () => {
    renderBlock();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
