import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import messages from "../../../messages/es.json";
import type { CertificationEnrollmentsPage } from "@/lib/api/certifications";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/certifications/3",
  useSearchParams: () => new URLSearchParams("tab=enrolled&page=2"),
}));
vi.mock("@/components/certifications/user-progress-sheet", () => ({
  UserProgressSheet: ({ open, target }: { open: boolean; target: { userId: string; name: string } | null }) =>
    open ? <div data-testid="progress-sheet">{target?.userId}:{target?.name}</div> : null,
}));

import { EnrolledUsersPanel } from "@/components/certifications/enrolled-users-panel";

const tr = createTranslator({
  locale: "es",
  messages,
  namespace: "evaluation.certYear.certifications.enrolled",
});

const data: CertificationEnrollmentsPage = {
  items: [
    {
      enrollment_id: 1,
      user_id: "u-1",
      name: "Valeria",
      paternal_last_name: "Ortiz",
      maternal_last_name: "Peña",
      club_name: "Club Orión",
      section_name: "Guías Mayores",
      status: "IN_PROGRESS",
      progress_percent: 71,
      enrollment_date: "2026-02-03",
    },
    {
      enrollment_id: 2,
      user_id: "u-2",
      name: "Andrés",
      paternal_last_name: "Ruiz",
      maternal_last_name: null,
      club_name: null,
      section_name: null,
      status: "CERTIFIED",
      progress_percent: 100,
      enrollment_date: "2026-02-03",
    },
  ],
  total: 22,
  page: 1,
  limit: 20,
};

function renderPanel(overrides: Partial<{ data: CertificationEnrollmentsPage; search: string; status: string }> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EnrolledUsersPanel
        data={overrides.data ?? data}
        certificationId={3}
        search={overrides.search ?? ""}
        status={overrides.status ?? ""}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("EnrolledUsersPanel", () => {
  it("marks only the exception status: normal progress shows no badge", () => {
    renderPanel();
    const table = screen.getByRole("table");
    expect(within(table).getByText(tr("status.CERTIFIED"))).toBeInTheDocument();
    expect(within(table).queryByText(tr("status.IN_PROGRESS"))).toBeNull();
    expect(within(table).getByText("Valeria Ortiz Peña")).toBeInTheDocument();
    expect(within(table).getByText("Club Orión · Guías Mayores")).toBeInTheDocument();
  });

  it("opens the person's progress from the row", () => {
    renderPanel();
    fireEvent.click(within(screen.getByRole("table")).getByText("Andrés Ruiz"));
    expect(screen.getByTestId("progress-sheet")).toHaveTextContent("u-2:Andrés Ruiz");
  });

  it("writes the search to the URL (debounced) and resets the page", () => {
    vi.useFakeTimers();
    renderPanel();
    fireEvent.change(screen.getByLabelText(tr("searchLabel")), { target: { value: "  Val " } });
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(replace).toHaveBeenCalledWith(
      "/dashboard/certifications/3?tab=enrolled&search=Val",
      { scroll: false },
    );
  });

  it("filters by status through the URL", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(tr("statusLabel")), { target: { value: "APPROVED" } });
    expect(replace).toHaveBeenCalledWith(
      "/dashboard/certifications/3?tab=enrolled&status=APPROVED",
      { scroll: false },
    );
  });

  it("tells an empty list from a filter without matches", () => {
    const empty = { ...data, items: [], total: 0 };
    const { unmount } = renderPanel({ data: empty });
    expect(screen.getByText(tr("emptyTitle"))).toBeInTheDocument();
    unmount();
    renderPanel({ data: empty, search: "zzz" });
    expect(screen.getByText(tr("noResultsTitle"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: tr("clearFilters") }));
    expect(replace).toHaveBeenCalledWith("/dashboard/certifications/3?tab=enrolled", { scroll: false });
  });
});
