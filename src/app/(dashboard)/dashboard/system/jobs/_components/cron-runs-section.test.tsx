/**
 * Scheduled tasks tab: one row per task, only a failed run is marked, and
 * "Ejecutar ahora" explains in the task's own words what is about to happen.
 * next-intl is mocked to echo keys so the test does not depend on translations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildAuthUser } from "@/lib/auth/testing/auth-user-fixture";
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
}));

vi.mock("next-intl", () => ({
  useLocale: () => "es",
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}|${JSON.stringify(values)}` : key,
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ user: mocks.user, isLoading: false, refresh: async () => {} }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError, info: mocks.toastInfo },
}));

vi.mock("@/lib/api/analytics", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/analytics")>();
  return { ...original, runCronJob: (...args: unknown[]) => mocks.runCronJob(...args) };
});

import { ApiError } from "@/lib/api/client";
import { CronRunsSection, STALE_RUNNING_THRESHOLD_MS } from "./cron-runs-section";
import { DETACHED_REFRESH_DELAY_MS } from "./cron-run-errors";

const SUPER_ADMIN: AuthUser = buildAuthUser({ id: "sa-1", email: "sa@test.com", roles: ["super-admin"] });
const ADMIN: AuthUser = buildAuthUser({ id: "a-1", email: "a@test.com", roles: ["admin"] });

const JOB = "data-export-cleanup";
const MEMBER_OF_MONTH = "member-of-month-auto-evaluate";

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

const catalog: CronJobDefinition[] = [JOB, MEMBER_OF_MONTH, "rankings-recalculate", "brand-new-job"].map((j) =>
  def(j),
);

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
      trigger: "scheduled",
      triggered_by: null,
    },
    {
      job_name: "rankings-recalculate",
      run_id: 2,
      started_at: "2026-10-21T03:00:00.000Z",
      ended_at: "2026-10-21T03:02:05.000Z",
      status: "failed",
      duration_ms: 125000,
      items_processed: null,
      error_message: "boom",
      trigger: "scheduled",
      triggered_by: null,
    },
  ],
  stats: [
    {
      job_name: "rankings-recalculate",
      last_success: null,
      last_failure: "2026-10-21T03:02:05.000Z",
      failure_rate_7d: 0.14,
      total_runs_7d: 7,
    },
  ] as CronRunsSummary["stats"],
};

function rowOf(job: string): HTMLElement {
  const row = document.querySelector<HTMLElement>(`tr[data-job="${job}"]`);
  if (!row) throw new Error(`row not found: ${job}`);
  return row;
}

function renderSection(props: Partial<React.ComponentProps<typeof CronRunsSection>> = {}) {
  return render(<CronRunsSection data={data} catalog={catalog} {...props} />);
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

async function openDialog(job: string) {
  await userEvent.click(within(rowOf(job)).getByRole("button", { name: /runNow/ }));
  return screen.findByRole("alertdialog");
}

describe("CronRunsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = SUPER_ADMIN;
    mocks.runCronJob.mockResolvedValue(runResult());
  });
  afterEach(() => cleanup());

  it("marks only the run that failed", () => {
    renderSection();
    expect(within(rowOf("rankings-recalculate")).getByText("failed")).toBeInTheDocument();
    expect(within(rowOf(JOB)).queryByText("failed")).not.toBeInTheDocument();
    expect(within(rowOf("rankings-recalculate")).getByText("14%")).toBeInTheDocument();
    expect(within(rowOf(JOB)).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows run-now only to super-admin and only for runnable jobs", () => {
    renderSection({ catalog: catalog.map((j) => (j.job_name === JOB ? { ...j, runnable: false } : j)) });
    expect(within(rowOf(JOB)).queryByRole("button")).not.toBeInTheDocument();
    expect(within(rowOf(MEMBER_OF_MONTH)).getByRole("button", { name: /runNow/ })).toBeInTheDocument();
    cleanup();

    mocks.user = ADMIN;
    renderSection();
    expect(screen.queryByRole("button", { name: /runNow/ })).not.toBeInTheDocument();
  });

  it("explains member of the month in its own words, naming the month", async () => {
    renderSection();
    const dialog = await openDialog(MEMBER_OF_MONTH);
    expect(within(dialog).getByText(/runDescriptions\.memberOfMonth\|\{"month":"[^"]+"\}/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "cron.runAndNotify" })).toBeInTheDocument();
  });

  it("uses the generic text for an unknown job and a plain confirm for one that notifies nobody", async () => {
    renderSection();
    const dialog = await openDialog("brand-new-job");
    expect(within(dialog).getByText(/runDescriptions\.generic/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "runDialogConfirm" })).toBeInTheDocument();
  });

  it("does not run when the dialog is cancelled and runs exactly once on confirm", async () => {
    renderSection();
    let dialog = await openDialog(JOB);
    await userEvent.click(within(dialog).getByRole("button", { name: "runDialogCancel" }));
    expect(mocks.runCronJob).not.toHaveBeenCalled();

    dialog = await openDialog(JOB);
    await userEvent.click(within(dialog).getByRole("button", { name: "runDialogConfirm" }));
    await waitFor(() => expect(mocks.runCronJob).toHaveBeenCalledTimes(1));
    expect(mocks.runCronJob).toHaveBeenCalledWith(JOB);
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    expect(mocks.toastSuccess).toHaveBeenCalledTimes(1);
  });

  it("disables run-now while the latest run is recent and enables it once stale", () => {
    const running = (startedAt: string): CronRunsSummary => ({
      ...data,
      recent: [
        {
          ...data.recent[0]!,
          status: "running",
          ended_at: null,
          duration_ms: null,
          started_at: startedAt,
        },
      ],
    });
    renderSection({ data: running(new Date().toISOString()) });
    expect(within(rowOf(JOB)).getByRole("button", { name: /runNow/ })).toBeDisabled();
    cleanup();

    renderSection({
      data: running(new Date(Date.now() - STALE_RUNNING_THRESHOLD_MS - 60_000).toISOString()),
    });
    expect(within(rowOf(JOB)).getByRole("button", { name: /runNow/ })).toBeEnabled();
  });

  it("tells the user a cut request keeps running and refreshes later, not at once", async () => {
    const spy = vi.spyOn(globalThis, "setTimeout");
    mocks.runCronJob.mockRejectedValue(new ApiError("Network Error", 500, null));
    renderSection();
    const dialog = await openDialog(JOB);
    await userEvent.click(within(dialog).getByRole("button", { name: "runDialogConfirm" }));

    await waitFor(() => expect(mocks.toastInfo).toHaveBeenCalledWith("runDetached"));
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    const delayed = spy.mock.calls.find((c) => c[1] === DETACHED_REFRESH_DELAY_MS);
    expect(delayed).toBeDefined();
    spy.mockRestore();
  });

  it("maps a coded 500 to the generic error", async () => {
    mocks.runCronJob.mockRejectedValue(new ApiError("kaboom", 500, { code: "WHATEVER" }));
    renderSection();
    const dialog = await openDialog(JOB);
    await userEvent.click(within(dialog).getByRole("button", { name: "runDialogConfirm" }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("runErrorGeneric"));
  });

  it("lists the known jobs without actions when the catalog could not load", () => {
    renderSection({ catalog: undefined });
    expect(screen.queryByRole("button", { name: /runNow/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("row").length).toBeGreaterThan(10);
  });
});
