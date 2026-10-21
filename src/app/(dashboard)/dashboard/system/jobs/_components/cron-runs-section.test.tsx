/**
 * "Ejecutar ahora" per scheduled job in the cron runs table.
 *
 * - Visible only for super-admin (backend also enforces).
 * - AlertDialog confirmation -> POST once -> result toast -> router.refresh().
 * - Error mapped by `code` only (never `details`).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../messages/es.json";
import type { AuthUser } from "@/lib/auth/types";
import type { CronJobDefinition, CronRunsSummary } from "@/lib/api/analytics";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mocks = vi.hoisted(() => ({
  user: null as AuthUser | null,
  runCronJob: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ user: mocks.user, isLoading: false, refresh: async () => {} }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    info: mocks.toastInfo,
    warning: mocks.toastWarning,
  },
}));

vi.mock("@/lib/api/analytics", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/analytics")>();
  return { ...original, runCronJob: (...args: unknown[]) => mocks.runCronJob(...args) };
});

import { ApiError } from "@/lib/api/client";
import { CronRunsSection, STALE_RUNNING_THRESHOLD_MS } from "./cron-runs-section";
import { DETACHED_REFRESH_DELAY_MS } from "./cron-run-errors";

const SUPER_ADMIN: AuthUser = {
  id: "sa-1",
  email: "sa@test.com",
  roles: ["super-admin"],
};
const ADMIN: AuthUser = { id: "a-1", email: "a@test.com", roles: ["admin"] };

const JOB = "rankings-recalculate";
const JOB_LABEL = "Clasificaciones anuales (recalcular)";

const data: CronRunsSummary = {
  recent: [
    {
      job_name: JOB,
      run_id: 1,
      started_at: "2026-10-20T03:00:00.000Z",
      ended_at: "2026-10-20T03:00:02.000Z",
      status: "completed",
      duration_ms: 2000,
      items_processed: 5,
      error_message: null,
      trigger: "manual",
      triggered_by: "sa-1",
    },
    {
      job_name: "fcm-tokens-cleanup",
      run_id: 2,
      // Just started: recomputed relative to "now" so the 15-min staleness never trips.
      started_at: new Date().toISOString(),
      ended_at: null,
      status: "running",
      duration_ms: null,
      items_processed: null,
      error_message: null,
      trigger: "scheduled",
      triggered_by: null,
    },
  ],
  stats: [],
};

const ALL_JOBS = [
  "activities-reminder",
  "rankings-recalculate",
  "annual-reports-auto-generate",
  "cleanup-expired-records",
  "fcm-tokens-cleanup",
  "cron-alert-check",
  "data-export-cleanup",
  "finance-period-closing",
  "dependent-profiles-purge",
  "family-age-transitions",
  "pending-teen-guardian",
  "investiture-achievement-intent",
  "investiture-authorization-reminders",
  "member-of-month-auto-evaluate",
  "membership-requests-expiry",
  "monthly-reports-auto-generate",
  "monthly-reports-reminders",
  "fcm-tokens-stale-cleanup",
  "quarterly-reports-auto-generate",
  "ecclesiastical-year-cut",
];

const MEMBER_OF_MONTH = "member-of-month-auto-evaluate";

const NOTIFY_JOBS = [
  "activities-reminder",
  "cron-alert-check",
  "monthly-reports-reminders",
  "pending-teen-guardian",
  "family-age-transitions",
  "investiture-authorization-reminders",
  "ecclesiastical-year-cut",
];

const NOTIFY_WARNING = "Este job puede enviar avisos o correos reales.";
const MEMBER_OF_MONTH_WARNING = messages.system_jobs.cronRuns.runDialogMemberOfMonthWarning;

function def(job: string, overrides: Partial<CronJobDefinition> = {}): CronJobDefinition {
  return {
    job_name: job,
    schedule: "0 3 * * *",
    time_zone: "America/Mexico_City",
    runnable: true,
    description: `Descripción de ${job}`,
    ...overrides,
  };
}

const catalog: CronJobDefinition[] = ALL_JOBS.map((j) => def(j));

function rowOf(job: string): HTMLElement {
  const row = screen
    .getAllByRole("row")
    .find((r) => within(r).queryAllByText(job, { exact: true }).length > 0);
  if (!row) throw new Error(`row not found: ${job}`);
  return row;
}

function renderSection(props: Partial<React.ComponentProps<typeof CronRunsSection>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CronRunsSection data={data} catalog={catalog} {...props} />
    </NextIntlClientProvider>,
  );
}

function runResult(overrides: Record<string, unknown> = {}) {
  return {
    job_name: JOB,
    run_id: 99,
    enqueued: false,
    status: "completed",
    items_processed: 12,
    duration_ms: 800,
    error_message: null,
    ...overrides,
  };
}

async function confirmRun() {
  await userEvent.click(
    screen.getByRole("button", { name: /Ejecutar ahora.*Clasificaciones anuales/i }),
  );
  const dialog = await screen.findByRole("alertdialog");
  await userEvent.click(within(dialog).getByRole("button", { name: "Ejecutar" }));
}

describe("CronRunsSection - run now", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = SUPER_ADMIN;
    mocks.runCronJob.mockResolvedValue(runResult());
  });
  afterEach(() => cleanup());

  it("shows the run-now action for super-admin", () => {
    renderSection();
    expect(
      screen.getByRole("button", { name: /Ejecutar ahora.*Clasificaciones anuales/i }),
    ).toBeInTheDocument();
  });

  it("hides the run-now action for non super-admin", () => {
    mocks.user = ADMIN;
    renderSection();
    expect(screen.queryByRole("button", { name: /Ejecutar ahora/i })).not.toBeInTheDocument();
  });

  it("hides the action for jobs that are not runnable", () => {
    renderSection({
      catalog: catalog.map((j) => (j.job_name === JOB ? { ...j, runnable: false } : j)),
    });
    expect(
      screen.queryByRole("button", { name: /Ejecutar ahora.*Clasificaciones anuales/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the action when the catalog is unavailable", () => {
    renderSection({ catalog: undefined });
    expect(screen.queryByRole("button", { name: /Ejecutar ahora/i })).not.toBeInTheDocument();
  });

  it("asks for confirmation with the job name and the note before running", async () => {
    renderSection();
    await userEvent.click(
      screen.getByRole("button", { name: /Ejecutar ahora.*Clasificaciones anuales/i }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText(`¿Ejecutar «${JOB_LABEL}» ahora?`),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Corre igual que la ejecución programada; si ya está corriendo se omitirá.",
      ),
    ).toBeInTheDocument();
    expect(mocks.runCronJob).not.toHaveBeenCalled();
  });

  it("does not call the endpoint when the confirmation is cancelled", async () => {
    renderSection();
    await userEvent.click(
      screen.getByRole("button", { name: /Ejecutar ahora.*Clasificaciones anuales/i }),
    );
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(mocks.runCronJob).not.toHaveBeenCalled();
  });

  it("calls the endpoint exactly once on confirm", async () => {
    renderSection();
    await confirmRun();
    await waitFor(() => expect(mocks.runCronJob).toHaveBeenCalledTimes(1));
    expect(mocks.runCronJob).toHaveBeenCalledWith(JOB);
  });

  it("shows a loading state and disables the action while the run is in flight", async () => {
    let resolve!: (v: unknown) => void;
    mocks.runCronJob.mockReturnValue(new Promise((r) => (resolve = r)));
    renderSection();
    await confirmRun();

    const busy = await screen.findByRole("button", { name: /Ejecutando.*Clasificaciones anuales/i });
    expect(busy).toBeDisabled();

    resolve(runResult());
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Ejecutar ahora.*Clasificaciones anuales/i }),
      ).toBeEnabled(),
    );
  });

  it("disables the action for a job whose latest run is still running", () => {
    renderSection();
    expect(
      screen.getByRole("button", { name: /Ejecutar ahora.*FCM tokens huérfanos/i }),
    ).toBeDisabled();
  });

  it("enables the action when the latest run has been 'running' for longer than the threshold", () => {
    const stale = new Date(Date.now() - STALE_RUNNING_THRESHOLD_MS - 60_000).toISOString();
    renderSection({
      data: {
        ...data,
        recent: data.recent.map((r) =>
          r.job_name === "fcm-tokens-cleanup" ? { ...r, started_at: stale } : r,
        ),
      },
    });
    expect(
      screen.getByRole("button", { name: /Ejecutar ahora.*FCM tokens huérfanos/i }),
    ).toBeEnabled();
  });

  it("toasts the completed result with processed items and refreshes the runs", async () => {
    renderSection();
    await confirmRun();
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Completado · 12 procesados"),
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("toasts a completed result without a count when items_processed is null", async () => {
    mocks.runCronJob.mockResolvedValue(runResult({ items_processed: null }));
    renderSection();
    await confirmRun();
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Completado"));
    expect(mocks.toastSuccess).not.toHaveBeenCalledWith(expect.stringContaining("0 procesados"));
  });

  it("still shows the count when items_processed is 0", async () => {
    mocks.runCronJob.mockResolvedValue(runResult({ items_processed: 0 }));
    renderSection();
    await confirmRun();
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Completado · 0 procesados"),
    );
  });

  it("toasts a skipped result", async () => {
    mocks.runCronJob.mockResolvedValue(runResult({ status: "skipped", items_processed: 0 }));
    renderSection();
    await confirmRun();
    await waitFor(() => expect(mocks.toastInfo).toHaveBeenCalledWith("Omitido"));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("toasts a failed result with the run error message", async () => {
    mocks.runCronJob.mockResolvedValue(
      runResult({ status: "failed", error_message: "boom" }),
    );
    renderSection();
    await confirmRun();
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Falló: boom"));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("maps 404 CRON_JOB_NOT_FOUND by code, never leaking details", async () => {
    mocks.runCronJob.mockRejectedValue(
      new ApiError("Cron job not found", 404, {
        code: "CRON_JOB_NOT_FOUND",
        message: "Cron job not found",
        details: { secret: "internal-detail" },
      }),
    );
    renderSection();
    await confirmRun();
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Este job no existe o no se puede ejecutar manualmente.",
      ),
    );
    const rendered = JSON.stringify(mocks.toastError.mock.calls);
    expect(rendered).not.toContain("internal-detail");
  });

  it("falls back to a generic error for unknown failures", async () => {
    mocks.runCronJob.mockRejectedValue(
      new ApiError("kaboom", 500, { code: "WHATEVER", details: "x-detail" }),
    );
    renderSection();
    await confirmRun();
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("No se pudo ejecutar el job."),
    );
    expect(JSON.stringify(mocks.toastError.mock.calls)).not.toContain("x-detail");
  });

  it("toasts a queued result for queue-backed jobs instead of the processed count", async () => {
    mocks.runCronJob.mockResolvedValue(
      runResult({ enqueued: true, run_id: null, items_processed: null }),
    );
    renderSection();
    await confirmRun();
    await waitFor(() =>
      expect(mocks.toastInfo).toHaveBeenCalledWith(
        "En cola · se ejecutará en segundo plano",
      ),
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  describe("long runs cut by the network/proxy", () => {
    const DETACHED = "La ejecución sigue en el servidor; revisa el historial en unos minutos";

    function lastDelayedRefresh(spy: { mock: { calls: unknown[][] } }) {
      const call = spy.mock.calls.find((c) => c[1] === DETACHED_REFRESH_DELAY_MS);
      return call?.[0] as (() => void) | undefined;
    }

    it("tells the user the run continues on the server when there is no response", async () => {
      mocks.runCronJob.mockRejectedValue(new ApiError("Network Error", 500, null));
      renderSection();
      await confirmRun();
      await waitFor(() => expect(mocks.toastInfo).toHaveBeenCalledWith(DETACHED));
      expect(mocks.toastError).not.toHaveBeenCalled();
    });

    it("treats a gateway timeout (504) the same way", async () => {
      mocks.runCronJob.mockRejectedValue(new ApiError("Gateway Timeout", 504, "<html/>"));
      renderSection();
      await confirmRun();
      await waitFor(() => expect(mocks.toastInfo).toHaveBeenCalledWith(DETACHED));
      expect(mocks.toastError).not.toHaveBeenCalled();
    });

    it("refreshes after a delay, not immediately", async () => {
      const spy = vi.spyOn(globalThis, "setTimeout");
      mocks.runCronJob.mockRejectedValue(new ApiError("Network Error", 500, null));
      renderSection();
      await confirmRun();
      await waitFor(() => expect(mocks.toastInfo).toHaveBeenCalledWith(DETACHED));
      expect(mocks.refresh).not.toHaveBeenCalled();

      const fn = lastDelayedRefresh(spy);
      expect(fn).toBeDefined();
      fn?.();
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });

    it("keeps a real 500 with a coded body as a generic failure", async () => {
      mocks.runCronJob.mockRejectedValue(new ApiError("kaboom", 500, { code: "WHATEVER" }));
      renderSection();
      await confirmRun();
      await waitFor(() =>
        expect(mocks.toastError).toHaveBeenCalledWith("No se pudo ejecutar el job."),
      );
      expect(mocks.toastInfo).not.toHaveBeenCalledWith(DETACHED);
    });
  });

  it("shows the Manual badge on recent runs triggered manually only", () => {
    renderSection();
    const rows = screen.getAllByRole("row");
    const manualRow = rows.find((r) => within(r).queryByText("rankings-recalculate"));
    const scheduledRow = rows.find((r) => within(r).queryByText("fcm-tokens-cleanup"));
    expect(within(manualRow as HTMLElement).getByText("Manual")).toBeInTheDocument();
    expect(within(scheduledRow as HTMLElement).queryByText("Manual")).not.toBeInTheDocument();
  });

  describe("every scheduled job from the catalog", () => {
    it("renders a row with the run action for all 20 catalog jobs (super-admin)", () => {
      renderSection();
      for (const job of ALL_JOBS) {
        expect(within(rowOf(job)).getByRole("button", { name: /Ejecutar ahora/i })).toBeInTheDocument();
      }
      expect(screen.getAllByRole("button", { name: /Ejecutar ahora/i })).toHaveLength(20);
    });

    it("shows the schedule and time zone per row", () => {
      renderSection({
        catalog: catalog.map((j) =>
          j.job_name === "ecclesiastical-year-cut"
            ? { ...j, schedule: "0 6 1 12 *", time_zone: "UTC" }
            : j,
        ),
      });
      expect(within(rowOf("ecclesiastical-year-cut")).getByText("0 6 1 12 * · UTC")).toBeInTheDocument();
      expect(
        within(rowOf("activities-reminder")).getByText("0 3 * * * · America/Mexico_City"),
      ).toBeInTheDocument();
    });

    it("shows only the schedule when the time zone is null", () => {
      renderSection({
        catalog: catalog.map((j) =>
          j.job_name === "activities-reminder" ? { ...j, time_zone: null } : j,
        ),
      });
      const row = rowOf("activities-reminder");
      expect(within(row).getByText("0 3 * * *")).toBeInTheDocument();
      expect(within(row).queryByText(/null/)).not.toBeInTheDocument();
    });

    it("shows a dash as last run for a job that never ran", () => {
      renderSection();
      const cells = within(rowOf("annual-reports-auto-generate")).getAllByRole("cell");
      expect(cells[1]).toHaveTextContent("—");
      expect(within(rowOf("annual-reports-auto-generate")).getByText("Sin ejecuciones")).toBeInTheDocument();
    });

    it("uses the translated label when a key exists", () => {
      renderSection();
      expect(
        within(rowOf("annual-reports-auto-generate")).getByText("Reportes anuales (auto-generar)"),
      ).toBeInTheDocument();
      expect(within(rowOf(JOB)).getByText(JOB_LABEL)).toBeInTheDocument();
    });

    it("falls back to the backend description for a job without translation", () => {
      renderSection({ catalog: [...catalog, def("brand-new-job", { description: "Un job nuevo" })] });
      expect(within(rowOf("brand-new-job")).getByText("Un job nuevo")).toBeInTheDocument();
    });

    it("falls back to the job name when there is no translation nor description", () => {
      renderSection({ catalog: [...catalog, def("brand-new-job", { description: "" })] });
      const labels = within(rowOf("brand-new-job")).getAllByText("brand-new-job");
      expect(labels.length).toBeGreaterThanOrEqual(1);
    });

    it("lists a job present only in the runs data even if the catalog lacks it", () => {
      renderSection({
        data: {
          ...data,
          recent: [
            ...data.recent,
            {
              job_name: "legacy-job",
              run_id: 7,
              started_at: "2026-10-20T05:00:00.000Z",
              ended_at: null,
              status: "completed",
              duration_ms: 10,
              items_processed: 1,
              error_message: null,
              trigger: "scheduled",
              triggered_by: null,
            },
          ],
        },
      });
      const row = rowOf("legacy-job");
      expect(within(row).queryByRole("button", { name: /Ejecutar ahora/i })).not.toBeInTheDocument();
    });

    it("falls back to the known jobs without run action when the catalog fails", () => {
      renderSection({ catalog: undefined });
      expect(screen.queryByRole("button", { name: /Ejecutar ahora/i })).not.toBeInTheDocument();
      expect(within(rowOf(JOB)).getByText(JOB_LABEL)).toBeInTheDocument();
      expect(screen.getAllByRole("row")).toHaveLength(1 + 20);
      expect(screen.getByText("annual-reports-auto-generate")).toBeInTheDocument();
    });

    it("hides the run action for non super-admin even with the full catalog", () => {
      mocks.user = ADMIN;
      renderSection();
      expect(screen.queryByRole("button", { name: /Ejecutar ahora/i })).not.toBeInTheDocument();
      expect(screen.getAllByRole("row")).toHaveLength(1 + 20);
    });
  });

  describe("notification warning in the confirm dialog", () => {
    async function openDialog(job: string) {
      await userEvent.click(within(rowOf(job)).getByRole("button", { name: /Ejecutar ahora/i }));
      return screen.findByRole("alertdialog");
    }

    const idle = { recent: [], stats: [] };

    it.each(NOTIFY_JOBS)("warns for %s", async (job) => {
      renderSection({ data: idle });
      const dialog = await openDialog(job);
      expect(within(dialog).getByText(NOTIFY_WARNING)).toBeInTheDocument();
    });

    it("shows the stronger warning instead of the generic one for member-of-month", async () => {
      renderSection({ data: idle });
      const dialog = await openDialog(MEMBER_OF_MONTH);
      expect(within(dialog).getByText(MEMBER_OF_MONTH_WARNING)).toBeInTheDocument();
      expect(within(dialog).queryByText(NOTIFY_WARNING)).not.toBeInTheDocument();
    });

    it("does not show the member-of-month warning for other jobs", async () => {
      renderSection({ data: idle });
      const dialog = await openDialog("activities-reminder");
      expect(within(dialog).queryByText(MEMBER_OF_MONTH_WARNING)).not.toBeInTheDocument();
    });

    it.each(ALL_JOBS.filter((j) => !NOTIFY_JOBS.includes(j) && j !== MEMBER_OF_MONTH))(
      "does not warn for %s",
      async (job) => {
        renderSection({ data: idle });
        const dialog = await openDialog(job);
        expect(within(dialog).queryByText(NOTIFY_WARNING)).not.toBeInTheDocument();
      },
    );
  });
});
