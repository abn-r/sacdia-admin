import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ResetPasswordState } from "@/lib/auth/reset-password-action";
import messages from "../../../messages/es.json";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

const mockAction = vi.fn<
  (state: ResetPasswordState, formData: FormData) => Promise<ResetPasswordState>
>();

vi.mock("@/lib/auth/reset-password-action", () => ({
  resetPasswordAction: (state: ResetPasswordState, formData: FormData) =>
    mockAction(state, formData),
}));

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

const t = messages.auth.reset_password;

function renderForm(token: string, variant?: "reset" | "invitation") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ResetPasswordForm token={token} variant={variant} />
    </NextIntlClientProvider>,
  );
}

async function submit() {
  await act(async () => {
    fireEvent.submit(document.querySelector("form")!);
  });
  await waitFor(() => expect(mockAction).toHaveBeenCalled());
}

describe("ResetPasswordForm", () => {
  afterEach(() => {
    cleanup();
    mockAction.mockReset();
  });

  it("without a token shows the invalid link message and no form", () => {
    renderForm("");
    expect(screen.getByText(t.invalid_title)).toBeTruthy();
    expect(screen.queryByLabelText(t.password_label)).toBeNull();
  });

  it("sends the token with the passwords and shows the success state", async () => {
    mockAction.mockResolvedValueOnce({ success: true });
    renderForm("tok-1");

    fireEvent.change(screen.getByLabelText(t.password_label), {
      target: { value: "Sacdia2026!ok" },
    });
    fireEvent.change(screen.getByLabelText(t.confirm_label), {
      target: { value: "Sacdia2026!ok" },
    });
    await submit();

    const sent = mockAction.mock.calls[0][1];
    expect(sent.get("token")).toBe("tok-1");
    expect(sent.get("password")).toBe("Sacdia2026!ok");
    await waitFor(() => expect(screen.getByText(t.success_title)).toBeTruthy());
  });

  it("shows the error and keeps the form", async () => {
    mockAction.mockResolvedValueOnce({ error: t.errors.mismatch });
    renderForm("tok-1");
    await submit();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(t.errors.mismatch),
    );
    expect(screen.getByLabelText(t.password_label)).toBeTruthy();
  });

  it("an expired link switches to the invalid link message", async () => {
    mockAction.mockResolvedValueOnce({
      error: t.errors.link_invalid,
      linkInvalid: true,
    });
    renderForm("tok-1");
    await submit();
    await waitFor(() => expect(screen.getByText(t.invalid_title)).toBeTruthy());
  });

  it("defaults to the reset copy and posts mode=reset", async () => {
    mockAction.mockResolvedValueOnce({ error: t.errors.mismatch });
    renderForm("tok-1");
    expect(screen.getByText(t.title)).toBeTruthy();
    expect(screen.queryByText(t.invitation.title)).toBeNull();
    await submit();
    expect(mockAction.mock.calls[0][1].get("mode")).toBe("reset");
  });

  describe("invitation variant", () => {
    it("shows the invitation copy and posts mode=invitation with the token", async () => {
      mockAction.mockResolvedValueOnce({ success: true });
      renderForm("tok-inv", "invitation");

      expect(screen.getByText(t.invitation.title)).toBeTruthy();
      expect(screen.getByText(t.invitation.description)).toBeTruthy();
      expect(screen.queryByText(t.title)).toBeNull();
      expect(
        screen.getByRole("button", { name: t.invitation.submit_idle }),
      ).toBeTruthy();

      await submit();

      const sent = mockAction.mock.calls[0][1];
      expect(sent.get("mode")).toBe("invitation");
      expect(sent.get("token")).toBe("tok-inv");
      await waitFor(() =>
        expect(screen.getByText(t.invitation.success_title)).toBeTruthy(),
      );
    });

    it("an expired invitation shows the invitation invalid message", async () => {
      mockAction.mockResolvedValueOnce({
        error: t.errors.link_invalid,
        linkInvalid: true,
      });
      renderForm("tok-inv", "invitation");
      await submit();
      await waitFor(() =>
        expect(screen.getByText(t.invitation.invalid_title)).toBeTruthy(),
      );
      expect(screen.queryByText(t.invalid_title)).toBeNull();
    });

    it("without a token shows the invitation invalid message and no form", () => {
      renderForm("", "invitation");
      expect(screen.getByText(t.invitation.invalid_title)).toBeTruthy();
      expect(screen.queryByLabelText(t.password_label)).toBeNull();
    });
  });
});
