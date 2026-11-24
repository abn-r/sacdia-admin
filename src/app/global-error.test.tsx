import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("./globals.css", () => ({}));

import GlobalError from "./global-error";

afterEach(() => {
  cleanup();
  document.cookie = "sacdia_admin_locale=; max-age=0";
});

const error = Object.assign(new Error("x"), { digest: "d1g3st" });

describe("GlobalError", () => {
  it("renders Spanish copy from the cookie and shows the ref", () => {
    document.cookie = "sacdia_admin_locale=es";
    render(<GlobalError error={error} reset={vi.fn()} />, { container: document.documentElement });
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    expect(screen.getByText(/ref d1g3st/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/dashboard");
  });

  it("falls back to navigator.language without cookie", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("fr-CA");
    render(<GlobalError error={error} reset={vi.fn()} />, { container: document.documentElement });
    expect(screen.getByText("Une erreur est survenue")).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("picks the locale from the cookie and calls reset", async () => {
    document.cookie = "sacdia_admin_locale=en";
    const reset = vi.fn();
    render(<GlobalError error={error} reset={reset} />, { container: document.documentElement });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
