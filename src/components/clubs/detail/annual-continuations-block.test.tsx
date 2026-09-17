import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../messages/es.json";
import type { ContinuationListItem } from "@/lib/api/annual-continuations";

const mockList = vi.fn();
const mockSubmit = vi.fn();

vi.mock("@/lib/api/annual-continuations", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/annual-continuations")>();
  return {
    ...original,
    listAnnualContinuationsFromClient: (
      ...args: Parameters<typeof original.listAnnualContinuationsFromClient>
    ) => mockList(...args),
    submitAnnualContinuationsFromClient: (
      ...args: Parameters<typeof original.submitAnnualContinuationsFromClient>
    ) => mockSubmit(...args),
  };
});

import { AnnualContinuationsBlock } from "@/components/clubs/detail/annual-continuations-block";

const ELIGIBLE: ContinuationListItem = {
  user_id: "user-av-graduate-uuid",
  name: "Eva Ávila Cruz",
  base_section_id: 10,
  ecclesiastical_year_id: 2026,
  annual_status: "not_enrolled",
  current_role: null,
  eligibility: "eligible",
  blocked_reason: null,
  suggested_class: { status: "resolved", class_id: 201, code: "AMG" },
};

const BLOCKED: ContinuationListItem = {
  user_id: "user-too-young",
  name: "Nico Niño",
  base_section_id: 10,
  ecclesiastical_year_id: 2026,
  annual_status: "not_enrolled",
  current_role: null,
  eligibility: "blocked",
  blocked_reason: "ANNUAL_CLASS_POLICY_UNRESOLVED",
  suggested_class: { status: "blocked", code: "ANNUAL_CLASS_POLICY_UNRESOLVED" },
};

function renderBlock() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AnnualContinuationsBlock sectionId={101} />
    </NextIntlClientProvider>,
  );
}

describe("AnnualContinuationsBlock", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockSubmit.mockReset();
    mockList.mockResolvedValue([ELIGIBLE, BLOCKED]);
    mockSubmit.mockResolvedValue([
      {
        user_id: ELIGIBLE.user_id,
        outcome: "enrolled",
        club_section_id: 101,
        ecclesiastical_year_id: 2026,
        enrollment_id: 9,
        error_code: null,
      },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it("lists eligible and blocked candidates from annual-continuations", async () => {
    renderBlock();

    await waitFor(() => {
      expect(screen.getByText("Eva Ávila Cruz")).toBeTruthy();
    });
    expect(screen.getByText("Nico Niño")).toBeTruthy();
    expect(mockList).toHaveBeenCalledWith(101, { limit: 100 });
    expect(JSON.stringify(mockList.mock.calls)).not.toContain("annual-enroll");

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).not.toBeDisabled();
    expect(checkboxes[1]).toBeDisabled();
  });

  it("posts selected user_ids and never calls annual-enroll", async () => {
    const user = userEvent.setup();
    renderBlock();

    await waitFor(() => {
      expect(screen.getByText("Eva Ávila Cruz")).toBeTruthy();
    });

    await user.click(screen.getAllByRole("checkbox")[0]!);
    await user.click(
      screen.getByRole("button", { name: messages.clubs.detail.sections.continuationsSubmit }),
    );

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(101, [ELIGIBLE.user_id]);
    });
    expect(JSON.stringify(mockSubmit.mock.calls)).not.toContain("annual-enroll");
    expect(
      screen.getByText("Inscritos: 1. Bloqueados: 0. Fallidos: 0."),
    ).toBeTruthy();
  });
});
