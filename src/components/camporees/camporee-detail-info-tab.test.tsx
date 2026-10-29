import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next-intl/server", () => ({
  getLocale: async () => "es",
  getTranslations: async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { CamporeeDetailInfoTab } from "@/components/camporees/camporee-detail-info-tab";
import type { Camporee } from "@/lib/api/camporees";

const camporee: Camporee = {
  camporee_id: 138,
  name: "Camporee de unión",
  start_date: "2026-07-02",
  end_date: "2026-07-05",
  includes_adventurers: false,
  includes_pathfinders: true,
  includes_master_guides: false,
};

afterEach(() => cleanup());

describe("CamporeeDetailInfoTab", () => {
  it("shows the organization (union) name in its summary card", async () => {
    render(
      await CamporeeDetailInfoTab({
        camporee,
        orgCard: { label: "labelUnionKpi", title: "Unión Mexicana del Norte" },
      }),
    );

    expect(screen.getByText("labelUnionKpi")).toBeInTheDocument();
    expect(screen.getByText("Unión Mexicana del Norte")).toBeInTheDocument();
  });

  it("does not expose the internal camporee id", async () => {
    const { container } = render(
      await CamporeeDetailInfoTab({
        camporee,
        orgCard: { label: "labelUnionKpi", title: "Unión Mexicana del Norte" },
      }),
    );

    expect(container.textContent).not.toMatch(/internalId/);
    expect(container.textContent).not.toMatch(/138/);
  });
});
