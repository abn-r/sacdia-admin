import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

const { mockApiRequest } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  apiRequestFromClient: mockApiRequest,
}));

import { UserAccessToggles } from "@/components/users/user-access-toggles";

function renderToggles(canManage: boolean) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <UserAccessToggles
        userId="user-1"
        initialAccessApp={false}
        initialAccessPanel={false}
        initialActive={true}
        canManage={canManage}
      />
    </NextIntlClientProvider>,
  );
}

describe("UserAccessToggles", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("hides the Accesos card when the actor cannot manage access flags", () => {
    renderToggles(false);

    expect(screen.queryByText("Accesos")).not.toBeInTheDocument();
    expect(screen.queryByText("Acceso a App")).not.toBeInTheDocument();
    expect(screen.queryByText("Acceso a Panel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Activo")).not.toBeInTheDocument();
  });

  it("shows Accesos switches for admin actors", () => {
    renderToggles(true);

    expect(screen.getByText("Accesos")).toBeInTheDocument();
    expect(screen.getByText("Acceso a App")).toBeInTheDocument();
    expect(screen.getByText("Acceso a Panel")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("does not PATCH when Accesos is hidden", async () => {
    const user = userEvent.setup();
    renderToggles(false);

    await user.click(document.body);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("PATCHes access_panel when an allowed actor toggles it", async () => {
    const user = userEvent.setup();
    renderToggles(true);

    await user.click(screen.getByRole("switch", { name: "Acceso a Panel" }));

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/admin/users/user-1",
      expect.objectContaining({
        method: "PATCH",
        body: { access_panel: true },
      }),
    );
  });
});
