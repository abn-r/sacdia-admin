import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...original, apiRequest: mocks.apiRequest };
});

import {
  isManualCronRun,
  listCronJobs,
  runCronJob,
} from "@/lib/api/analytics";

describe("cron jobs API", () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset();
  });

  it("listCronJobs unwraps data.jobs from GET /admin/cron-jobs", async () => {
    const jobs = [
      {
        job_name: "rankings-recalculate",
        schedule: "0 3 * * *",
        time_zone: "America/Mexico_City",
        runnable: true,
        description: "Recalcula rankings",
      },
    ];
    mocks.apiRequest.mockResolvedValue({ data: { jobs } });

    await expect(listCronJobs()).resolves.toEqual(jobs);
    expect(mocks.apiRequest).toHaveBeenCalledWith("/admin/cron-jobs");
  });

  it("runCronJob POSTs to the run endpoint and returns the run result", async () => {
    const result = {
      job_name: "rankings-recalculate",
      run_id: 42,
      status: "completed",
      items_processed: 7,
      duration_ms: 1200,
      error_message: null,
    };
    mocks.apiRequest.mockResolvedValue({ data: result });

    await expect(runCronJob("rankings-recalculate")).resolves.toEqual(result);
    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      "/admin/cron-jobs/rankings-recalculate/run",
      { method: "POST" },
    );
  });

  it("runCronJob encodes the job name in the path", async () => {
    mocks.apiRequest.mockResolvedValue({ data: {} });
    await runCronJob("a/b c");
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      "/admin/cron-jobs/a%2Fb%20c/run",
      { method: "POST" },
    );
  });
});

describe("isManualCronRun", () => {
  it("is true only when metadata.trigger === 'manual'", () => {
    expect(isManualCronRun({ trigger: "manual", triggered_by: "u1" })).toBe(true);
    expect(isManualCronRun({ trigger: "schedule" })).toBe(false);
    expect(isManualCronRun({})).toBe(false);
    expect(isManualCronRun(null)).toBe(false);
    expect(isManualCronRun(undefined)).toBe(false);
  });
});
