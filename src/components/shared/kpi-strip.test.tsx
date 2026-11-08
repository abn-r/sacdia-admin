import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);
import { KpiStrip, KpiStripItem } from "@/components/shared/kpi-strip";

describe("KpiStrip", () => {
  it("renders items as a list with label, value, unit and subline", () => {
    render(
      <KpiStrip aria-label="Resumen">
        <KpiStripItem label="Clubes" value="12" unit="/ 20" subline="activos" emphasis />
        <KpiStripItem label="Socios" value="340" meter={{ value: 40, tone: "warning" }} />
      </KpiStrip>,
    );
    expect(screen.getByRole("list", { name: "Resumen" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Clubes")).toBeInTheDocument();
    expect(screen.getByText("/ 20")).toBeInTheDocument();
    expect(screen.getByText("activos")).toBeInTheDocument();
    const meter = document.querySelector('[data-slot="kpi-strip-meter"]');
    expect(meter?.getAttribute("data-tone")).toBe("warning");
  });

  it("defaults the meter to neutral", () => {
    render(
      <KpiStrip>
        <KpiStripItem label="A" value="1" meter={{ value: 90 }} />
      </KpiStrip>,
    );
    expect(document.querySelector('[data-slot="kpi-strip-meter"]')?.getAttribute("data-tone")).toBe(
      "neutral",
    );
  });
});
