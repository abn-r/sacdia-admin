import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ClubRegistrationActions } from "@/components/camporees/club-registration-actions";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockClose = vi.fn();
const mockReopen = vi.fn();
vi.mock("@/lib/api/camporees", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporees")>();
  return {
    ...original,
    closeCamporeeClubRegistration: (...args: unknown[]) => mockClose(...args),
    reopenCamporeeClubRegistration: (...args: unknown[]) => mockReopen(...args),
  };
});

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
  },
}));

const t = messages.camporees.clubRegistration;

function renderActions(
  props: Partial<React.ComponentProps<typeof ClubRegistrationActions>> = {},
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ClubRegistrationActions
        camporeeId={73}
        canManage
        enrolledClubCount={2}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("ClubRegistrationActions", () => {
  beforeEach(() => {
    mockClose.mockReset().mockResolvedValue({});
    mockReopen.mockReset().mockResolvedValue({});
    mockRefresh.mockReset();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("no renderiza sin permiso", () => {
    renderActions({ canManage: false });
    expect(screen.queryByTestId("club-registration-close")).toBeNull();
  });

  it("cierra inscripción de clubes locales", async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByTestId("club-registration-close"));
    await user.click(screen.getByRole("button", { name: t.closeConfirm }));

    await waitFor(() => {
      expect(mockClose).toHaveBeenCalledWith(73, { isUnion: false });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(t.closeSuccess);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("deshabilita cierre sin clubes inscritos", () => {
    renderActions({ enrolledClubCount: 0 });
    expect(screen.getByTestId("club-registration-close")).toBeDisabled();
  });

  it("reabre cuando está cerrada y no hay scoring", async () => {
    const user = userEvent.setup();
    renderActions({ closedAt: "2026-08-19T20:58:24.000Z", isUnion: true });

    await user.click(screen.getByTestId("club-registration-reopen"));
    await user.click(screen.getByRole("button", { name: t.reopenConfirm }));

    await waitFor(() => {
      expect(mockReopen).toHaveBeenCalledWith(73, { isUnion: true });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(t.reopenSuccess);
  });

  it("bloquea reopen si ya hay scoring", () => {
    renderActions({
      closedAt: "2026-08-19T20:58:24.000Z",
      hasScoringArtifacts: true,
    });
    expect(screen.getByTestId("club-registration-reopen")).toBeDisabled();
  });
});
