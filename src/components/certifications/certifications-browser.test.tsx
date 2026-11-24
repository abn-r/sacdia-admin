import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import messages from "../../../messages/es.json";
import type { CertificationListItem } from "@/lib/certifications/list";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/certifications",
  useSearchParams: () => new URLSearchParams(),
}));

import { CertificationsBrowser } from "@/components/certifications/certifications-browser";

const tr = createTranslator({
  locale: "es",
  messages,
  namespace: "evaluation.certYear.certifications.list",
});

const items: CertificationListItem[] = [
  { certification_id: 1, name: "Liderazgo juvenil", description: null, duration_weeks: 12, modules_count: 4, active: true },
  { certification_id: 2, name: "Consejería básica", description: null, duration_weeks: 8, modules_count: 3, active: false },
];

function renderBrowser(total = 2) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CertificationsBrowser items={items} total={total} page={1} limit={20} />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe("CertificationsBrowser", () => {
  it("filters the loaded page by name", () => {
    renderBrowser();
    fireEvent.change(screen.getByLabelText(tr("searchLabel")), { target: { value: "consejeria" } });
    expect(screen.queryAllByText("Liderazgo juvenil")).toHaveLength(0);
    expect(screen.getAllByText("Consejería básica").length).toBeGreaterThan(0);
  });

  it("says the filter covers only this page when there are more pages", () => {
    renderBrowser(45);
    fireEvent.change(screen.getByLabelText(tr("searchLabel")), { target: { value: "lid" } });
    expect(screen.getByText(tr("pageOnlyNotice"))).toBeInTheDocument();
  });

  it("offers to clear a search without matches", () => {
    renderBrowser();
    fireEvent.change(screen.getByLabelText(tr("searchLabel")), { target: { value: "zzz" } });
    expect(screen.getByText(tr("noResultsTitle"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: tr("clearFilters") }));
    expect(screen.getAllByText("Liderazgo juvenil").length).toBeGreaterThan(0);
  });
});
