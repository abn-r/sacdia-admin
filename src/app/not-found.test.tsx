import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/es.json";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import NotFound from "./not-found";

afterEach(cleanup);

describe("root NotFound", () => {
  it("renders one title, a home link and no search button", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <NotFound />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByText("No encontramos esta página")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("button", { name: "Buscar" })).not.toBeInTheDocument();
  });
});
