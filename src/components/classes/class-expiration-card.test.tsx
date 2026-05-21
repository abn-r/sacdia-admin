import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

let actionState: {
  error?: string;
  result?: {
    ecclesiastical_year_id: number;
    dry_run: boolean;
    scanned_count: number;
    expired_count: number;
    enrollment_ids: number[];
  };
} = {};

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: () => [actionState, vi.fn(), false],
  };
});

vi.mock("@/lib/classes/actions", () => ({
  expireOverdueClassEnrollmentsAction: vi.fn(),
}));

import { ClassExpirationCard } from "@/components/classes/class-expiration-card";

function renderCard() {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ClassExpirationCard
        ecclesiasticalYears={[
          { ecclesiastical_year_id: 10, name: "Año 2026", active: true },
        ]}
      />
    </NextIntlClientProvider>,
  );
}

describe("ClassExpirationCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionState = {};
  });

  afterEach(() => cleanup());

  it("disables destructive apply until a dry-run result exists", () => {
    renderCard();

    expect(screen.getByRole("button", { name: /aplicar vencimiento/i })).toBeDisabled();
  });

  it("requires confirmation with the dry-run expiration count before applying", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    actionState = {
      result: {
        ecclesiastical_year_id: 10,
        dry_run: true,
        scanned_count: 4,
        expired_count: 2,
        enrollment_ids: [1, 2],
      },
    };

    renderCard();
    await user.click(screen.getByRole("button", { name: /aplicar vencimiento/i }));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("2"));
    confirmSpy.mockRestore();
  });
});
