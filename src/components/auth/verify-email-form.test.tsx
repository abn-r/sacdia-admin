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
import type { VerifyEmailState } from "@/lib/auth/verify-email-action";
import messages from "../../../messages/es.json";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

const mockAction = vi.fn<
  (state: VerifyEmailState, formData: FormData) => Promise<VerifyEmailState>
>();

vi.mock("@/lib/auth/verify-email-action", () => ({
  verifyEmailAction: (state: VerifyEmailState, formData: FormData) =>
    mockAction(state, formData),
}));

import { VerifyEmailForm } from "@/components/auth/verify-email-form";

const t = messages.auth.verify_email;

function renderForm(token: string) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <VerifyEmailForm token={token} />
    </NextIntlClientProvider>,
  );
}

async function submit() {
  await act(async () => {
    fireEvent.submit(document.querySelector("form")!);
  });
  await waitFor(() => expect(mockAction).toHaveBeenCalled());
}

describe("VerifyEmailForm", () => {
  afterEach(() => {
    cleanup();
    mockAction.mockReset();
  });

  it("without a token shows the invalid link message and no button", () => {
    renderForm("");
    expect(screen.getByText(t.invalid_title)).toBeTruthy();
    expect(screen.queryByRole("button", { name: t.submit_idle })).toBeNull();
  });

  it("does not verify until the button is pressed", () => {
    renderForm("tok-1");
    expect(screen.getByRole("button", { name: t.submit_idle })).toBeTruthy();
    expect(mockAction).not.toHaveBeenCalled();
  });

  it("sends the token and shows the success state", async () => {
    mockAction.mockResolvedValueOnce({ success: true });
    renderForm("tok-1");
    await submit();

    expect(mockAction.mock.calls[0][1].get("token")).toBe("tok-1");
    await waitFor(() => expect(screen.getByText(t.success_title)).toBeTruthy());
  });

  it("shows the error and keeps the button", async () => {
    mockAction.mockResolvedValueOnce({ error: t.errors.generic });
    renderForm("tok-1");
    await submit();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(t.errors.generic),
    );
    expect(screen.getByRole("button", { name: t.submit_idle })).toBeTruthy();
  });

  it("an expired link switches to the invalid link message", async () => {
    mockAction.mockResolvedValueOnce({ linkInvalid: true });
    renderForm("tok-1");
    await submit();
    await waitFor(() => expect(screen.getByText(t.invalid_title)).toBeTruthy());
  });
});
