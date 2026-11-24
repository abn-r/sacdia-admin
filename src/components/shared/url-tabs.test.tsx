import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const replace = vi.fn();
let search = "club=3&tab=pending";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dashboard/x",
  useSearchParams: () => new URLSearchParams(search),
}));

import { UrlTabs } from "./url-tabs";

const tabs = [
  { value: "all", label: "Todas", count: 5 },
  { value: "pending", label: "Pendientes", count: 2 },
];

describe("UrlTabs", () => {
  afterEach(() => {
    cleanup();
    replace.mockClear();
    search = "club=3&tab=pending";
  });

  it("marks the tab from the URL as selected and shows counts", () => {
    render(<UrlTabs tabs={tabs} defaultValue="all" />);
    expect(screen.getByRole("tab", { name: /Pendientes/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Todas/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("falls back to default when param is missing", () => {
    search = "";
    render(<UrlTabs tabs={tabs} defaultValue="all" />);
    expect(screen.getByRole("tab", { name: /Todas/ })).toHaveAttribute("aria-selected", "true");
  });

  it("replaces the URL keeping other params without scrolling", () => {
    search = "club=3";
    render(<UrlTabs tabs={tabs} defaultValue="all" />);
    fireEvent.click(screen.getByRole("tab", { name: /Pendientes/ }));
    expect(replace).toHaveBeenCalledWith("/dashboard/x?club=3&tab=pending", { scroll: false });
  });

  it("drops the param when selecting the default tab", () => {
    render(<UrlTabs tabs={tabs} defaultValue="all" />);
    fireEvent.click(screen.getByRole("tab", { name: /Todas/ }));
    expect(replace).toHaveBeenCalledWith("/dashboard/x?club=3", { scroll: false });
  });
});
