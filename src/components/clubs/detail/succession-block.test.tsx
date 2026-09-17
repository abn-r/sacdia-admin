import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../messages/es.json";

const { mockSucceed, mockRefresh } = vi.hoisted(() => ({
  mockSucceed: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/lib/clubs/actions", () => ({
  succeedClubSectionDirectorAction: mockSucceed,
}));

import { SuccessionBlock } from "@/components/clubs/detail/succession-block";

function renderBlock() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SuccessionBlock
        clubId={7}
        sectionId={101}
        currentYearId={2026}
        currentAssignmentId="old-assignment"
        members={[{ user_id: "successor-user", name: "Luis Sucesor" }]}
      />
    </NextIntlClientProvider>,
  );
}

describe("SuccessionBlock", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    mockSucceed.mockReset();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("binds current assignment and year, then asks to confirm before submit", async () => {
    const user = userEvent.setup();
    const { container } = renderBlock();

    expect(
      screen.getByText(
        "Termina el director de este año y nombra al nuevo ahora. No es la preelección del año que viene.",
      ),
    ).toBeTruthy();
    expect(
      (container.querySelector('input[name="current_assignment_id"]') as HTMLInputElement)
        .value,
    ).toBe("old-assignment");
    expect(
      (container.querySelector('input[name="ecclesiastical_year_id"]') as HTMLInputElement)
        .value,
    ).toBe("2026");

    await user.selectOptions(
      container.querySelector("select[name='successor_user_id']") as HTMLSelectElement,
      "successor-user",
    );

    const confirm = vi.mocked(window.confirm);
    confirm.mockReturnValueOnce(false);
    await user.click(
      screen.getByRole("button", { name: messages.clubs.detail.sections.succeedNow }),
    );
    expect(confirm).toHaveBeenCalledWith(
      messages.clubs.detail.sections.succeedConfirm,
    );
    expect(mockSucceed).not.toHaveBeenCalled();
  });
});
