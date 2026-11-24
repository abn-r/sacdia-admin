import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../../messages/es.json";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import DashboardNotFound from "./page";

afterEach(cleanup);

describe("DashboardNotFound", () => {
  it("renders one title and the search button dispatches the open-search event", async () => {
    const listener = vi.fn();
    window.addEventListener("sacdia:open-search", listener);
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <DashboardNotFound />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByText("No encontramos esta página")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/dashboard");
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    window.removeEventListener("sacdia:open-search", listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
