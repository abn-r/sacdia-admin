import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { RankingTier } from "@/lib/api/annual-rankings";

const mockUpdate = vi.fn();
vi.mock("@/lib/api/annual-rankings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/annual-rankings")>()),
  updateRankingTier: (...args: unknown[]) => mockUpdate(...args),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { RankingTiersPanel } from "./ranking-tiers-panel";

const tier = (n: number, name: string, pct: number): RankingTier => ({
  ranking_tier_id: `a0000000-0000-4000-8000-00000000000${n}`,
  name,
  slug: name.toLowerCase(),
  band_percentage: pct,
  color: null,
  icon: null,
  sort_order: n,
  active: true,
});

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RankingTiersPanel initialTiers={[tier(1, "Excelencia", 85), tier(2, "Distinción", 70)]} />
    </NextIntlClientProvider>,
  );
}

describe("RankingTiersPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockImplementation(async (id: string, body: { band_percentage: number }) => ({
      ...tier(1, "Excelencia", body.band_percentage),
      ranking_tier_id: id,
    }));
  });
  afterEach(cleanup);

  it("has a single Guardar button and sends only the changed recognitions", async () => {
    renderPanel();

    expect(screen.getAllByRole("button", { name: "Guardar" })).toHaveLength(1);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Porcentaje de Excelencia" }), {
      target: { value: "90" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0]?.[1]).toMatchObject({ band_percentage: 90 });
  });
});
