import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/es.json";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: capture }));

import DashboardError from "./error";

afterEach(() => {
  cleanup();
  capture.mockClear();
});

function setup(reset = vi.fn()) {
  const error = Object.assign(new Error("boom"), { digest: "abc123" });
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DashboardError error={error} reset={reset} />
    </NextIntlClientProvider>,
  );
  return { reset, error };
}

describe("DashboardError", () => {
  it("renders a single title, home action and digest ref", () => {
    setup();
    expect(screen.getAllByText("No pudimos mostrar esta página")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("button", { name: /Copiar detalle/ })).toBeInTheDocument();
  });

  it("retry calls reset and the error is reported to Sentry", async () => {
    const { reset, error } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(error);
  });

  it("copy detail includes the digest", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Copiar detalle/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("ref: abc123"));
  });
});
