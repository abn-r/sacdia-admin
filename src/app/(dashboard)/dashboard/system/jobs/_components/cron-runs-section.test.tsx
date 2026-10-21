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
import type { CronRunsSummary } from "@/lib/api/analytics";

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
import { CronRunsSection } from "./cron-runs-section";
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
      started_at: "2026-10-20T04:00:00.000Z",
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

const runnableJobs = [JOB, "fcm-tokens-cleanup"];

function renderSection(props: Partial<React.ComponentProps<typeof CronRunsSection>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CronRunsSection data={data} runnableJobs={runnableJobs} {...props} />
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
    renderSection({ runnableJobs: ["fcm-tokens-cleanup"] });
    expect(
      screen.queryByRole("button", { name: /Ejecutar ahora.*Clasificaciones anuales/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the action when no runnable jobs are known", () => {
    renderSection({ runnableJobs: [] });
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
      screen.getByRole("button", { name: /Ejecutar ahora.*Cleanup FCM tokens/i }),
    ).toBeDisabled();
  });

  it("toasts the completed result with processed items and refreshes the runs", async () => {
    renderSection();
    await confirmRun();
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Completado · 12 procesados"),
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
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
});
