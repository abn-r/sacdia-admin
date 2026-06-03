import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import { AuthProvider } from "@/lib/auth/auth-context";
import { BirthdayCelebrationModal } from "./birthday-celebration-modal";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

function renderModal(birthday: string | null) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AuthProvider
        initialUser={{
          id: "user-1",
          user_id: "user-1",
          email: "user@example.com",
          name: "Usuario",
          birthday,
          roles: ["admin"],
        }}
      >
        <BirthdayCelebrationModal />
      </AuthProvider>
    </NextIntlClientProvider>,
  );
}

describe("BirthdayCelebrationModal", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 5, 3, 12));
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
  });

  it("shows the celebration only on the user's birthday", async () => {
    renderModal("2000-06-03");

    expect(await screen.findByText("¡Feliz cumpleaños!")).toBeInTheDocument();
  });

  it("does not show the celebration outside the user's birthday", () => {
    renderModal("2000-06-04");

    expect(screen.queryByText("¡Feliz cumpleaños!")).not.toBeInTheDocument();
  });

  it("persists the no-show choice for the current birthday", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderModal("2000-06-03");

    await user.click(await screen.findByRole("button", { name: /no volver a mostrar/i }));

    await waitFor(() =>
      expect(localStorage.getItem("sacdia:birthday:user-1:2026:06-03")).toBe("dismissed"),
    );
  });
});
