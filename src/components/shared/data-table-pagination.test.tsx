import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { DataTablePagination } from "./data-table-pagination";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/clubs",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe("DataTablePagination", () => {
  it("names the page-size selector after its visible label", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <DataTablePagination page={1} totalPages={1} total={7} limit={20} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("combobox", { name: "Por página" })).toBeInTheDocument();
  });
});
