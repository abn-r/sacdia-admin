import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../../messages/es.json";
import type { CronHistoryPage } from "@/lib/api/analytics";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { CronHistoryClient } from "./cron-history-client";

const base = {
  ended_at: "2026-10-20T03:00:02.000Z",
  duration_ms: 2000,
  status: "completed",
  items_processed: 3,
  error_message: null,
};

const page: CronHistoryPage = {
  total: 2,
  page: 1,
  limit: 20,
  items: [
    {
      ...base,
      run_id: 10,
      job_name: "rankings-recalculate",
      started_at: "2026-10-20T03:00:00.000Z",
      metadata: { trigger: "manual", triggered_by: "user-1" },
    },
    {
      ...base,
      run_id: 11,
      job_name: "fcm-tokens-cleanup",
      started_at: "2026-10-19T03:00:00.000Z",
      metadata: { trigger: "schedule" },
    },
  ],
};

function renderHistory() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CronHistoryClient initialData={page} searchParams={{}} />
    </NextIntlClientProvider>,
  );
}

describe("CronHistoryClient - manual badge", () => {
  afterEach(() => cleanup());

  it("shows a Manual badge only on manually triggered runs", () => {
    renderHistory();
    const rows = screen.getAllByRole("row");
    const manualRow = rows.find((r) => within(r).queryByText("rankings-recalculate"));
    const scheduledRow = rows.find((r) => within(r).queryByText("fcm-tokens-cleanup"));
    expect(manualRow).toBeDefined();
    expect(scheduledRow).toBeDefined();
    expect(within(manualRow as HTMLElement).getByText("Manual")).toBeInTheDocument();
    expect(within(scheduledRow as HTMLElement).queryByText("Manual")).not.toBeInTheDocument();
  });
});
