import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

vi.mock("@/lib/notifications/actions", () => ({
  sendDirectNotificationAction: vi.fn(),
  broadcastNotificationAction: vi.fn(),
  clubNotificationAction: vi.fn(),
}));

import { ClubNotificationForm } from "./notification-forms";

afterEach(() => {
  cleanup();
});

function renderForm(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ClubNotificationForm", () => {
  it("distingue error de carga de targets y bloquea el envío", () => {
    renderForm(<ClubNotificationForm clubTargetsLoadError />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudieron cargar los targets de club autorizados.",
    );
    expect(
      screen.getByRole("button", { name: "Enviar a club" }),
    ).toBeDisabled();
  });
});
