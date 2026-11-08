import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { DataTablePagination } from "./data-table-pagination";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/clubs",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
});

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("DataTablePagination", () => {
  it("names the page-size selector after its visible label", () => {
    renderWithIntl(<DataTablePagination page={1} totalPages={1} total={7} limit={20} />);

    expect(screen.getByRole("combobox", { name: "Por página" })).toBeInTheDocument();
  });

  it("pushes the page to the URL in URL mode", () => {
    renderWithIntl(<DataTablePagination page={2} totalPages={5} total={90} limit={20} />);

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(push).toHaveBeenCalledWith("/dashboard/clubs?page=3");
  });

  it("calls onPageChange and never touches the router in controlled mode", () => {
    const onPageChange = vi.fn();
    renderWithIntl(
      <DataTablePagination
        page={2}
        totalPages={5}
        total={90}
        limit={20}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 3);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 1);
    expect(push).not.toHaveBeenCalled();
  });

  it("disables previous on the first page and next on the last in controlled mode", () => {
    const onPageChange = vi.fn();
    const { rerender } = renderWithIntl(
      <DataTablePagination page={1} totalPages={3} total={25} limit={10} onPageChange={onPageChange} />,
    );
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();

    rerender(
      <NextIntlClientProvider locale="es" messages={messages}>
        <DataTablePagination page={3} totalPages={3} total={25} limit={10} onPageChange={onPageChange} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
  });

  it("includes a non-default page size in the options", () => {
    renderWithIntl(
      <DataTablePagination page={1} totalPages={3} total={25} limit={10} onPageChange={vi.fn()} />,
    );

    expect(screen.getByRole("combobox", { name: "Por página" })).toHaveTextContent("10");
  });
});
