import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../../messages/es.json";
import type { CronHistoryPage } from "@/lib/api/analytics";
import { CRON_JOB_NAMES } from "@/lib/system/cron-jobs";

Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

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

function renderHistory(data: CronHistoryPage = page) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CronHistoryClient initialData={data} searchParams={{}} />
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

describe("CronHistoryClient - job labels and filter", () => {
  afterEach(() => cleanup());

  it("lists every scheduled job in the job filter", async () => {
    expect(CRON_JOB_NAMES).toHaveLength(20);
    const user = userEvent.setup();
    renderHistory();
    const [jobFilter] = screen.getAllByRole("combobox");
    await user.click(jobFilter as HTMLElement);
    const listbox = await screen.findByRole("listbox");
    // "Todos los jobs" + one option per scheduled job
    expect(within(listbox).getAllByRole("option")).toHaveLength(CRON_JOB_NAMES.length + 1);
    expect(
      within(listbox).getByRole("option", { name: "Depuración de perfiles de dependientes" }),
    ).toBeInTheDocument();
    expect(
      within(listbox).getByRole("option", { name: "Corte del año eclesiástico" }),
    ).toBeInTheDocument();
  });

  it("translates the label of a job that was previously missing", () => {
    renderHistory({
      ...page,
      total: 1,
      items: [
        {
          ...base,
          run_id: 20,
          job_name: "dependent-profiles-purge",
          started_at: "2026-10-20T03:00:00.000Z",
          metadata: null,
        },
      ],
    });
    expect(screen.getByText("Depuración de perfiles de dependientes")).toBeInTheDocument();
    expect(screen.getByText("dependent-profiles-purge")).toBeInTheDocument();
  });

  it("falls back to the raw job name for unknown jobs", () => {
    renderHistory({
      ...page,
      total: 1,
      items: [
        {
          ...base,
          run_id: 21,
          job_name: "brand-new-job",
          started_at: "2026-10-20T03:00:00.000Z",
          metadata: null,
        },
      ],
    });
    const row = screen.getAllByRole("row")[1] as HTMLElement;
    // Label and mono subtitle both render the raw name
    expect(within(row).getAllByText("brand-new-job")).toHaveLength(2);
  });
});

describe("CronHistoryClient - row menus and detail dialog", () => {
  afterEach(() => cleanup());

  it("names each row menu with the readable job label and its start time", () => {
    renderHistory();
    const triggers = screen.getAllByRole("button", { name: /^Acciones de / });
    expect(triggers).toHaveLength(2);
    const names = triggers.map((el) => el.getAttribute("aria-label"));
    expect(new Set(names).size).toBe(2);
    for (const name of names) {
      expect(name).not.toContain("rankings-recalculate");
      expect(name).not.toContain("fcm-tokens-cleanup");
    }
    expect(names[0]).toContain("Clasificaciones anuales (recalcular)");
    expect(names[1]).toContain("Limpieza de tokens FCM huérfanos");
  });

  it("opens a Spanish detail dialog without leftover English labels", async () => {
    const user = userEvent.setup();
    renderHistory();
    const [firstTrigger] = screen.getAllByRole("button", { name: /^Acciones de / });
    await user.click(firstTrigger as HTMLElement);
    await user.click(await screen.findByRole("menuitem", { name: "Ver" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Detalles de la ejecución #10")).toBeInTheDocument();
    expect(within(dialog).getByText("Estado")).toBeInTheDocument();
    expect(within(dialog).queryByText("Status")).not.toBeInTheDocument();
    expect(
      within(dialog).getByText("Ejecución de la tarea Clasificaciones anuales (recalcular)"),
    ).toBeInTheDocument();
  });
});
