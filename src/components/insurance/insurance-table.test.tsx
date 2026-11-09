import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { MemberInsurance } from "@/lib/api/insurance";
import { InsuranceTable } from "./insurance-table";

const LONG_PROVIDER = "Seguro Anual ACV (piloto dev)";

const MEMBER: MemberInsurance = {
  user_id: "user-abc-123",
  name: "Ana",
  paternal_last_name: "García",
  maternal_last_name: "López",
  user_image: null,
  insurance: {
    insurance_id: 55,
    insurance_type: "GENERAL_ACTIVITIES",
    policy_number: "ORD20260001",
    provider: LONG_PROVIDER,
    start_date: "2026-08-19T00:00:00.000Z",
    end_date: "2027-08-19T00:00:00.000Z",
    coverage_amount: null,
    active: true,
    evidence_file_url: null,
    evidence_file_name: null,
    created_at: null,
    modified_at: null,
    created_by_name: null,
    modified_by_name: null,
  },
};

function renderTable() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InsuranceTable items={[MEMBER]} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("InsuranceTable status colors", () => {
  it("shows current coverage as a success status, not with the brand accent", () => {
    renderTable();

    const status = within(screen.getByRole("table")).getByText(messages.insurance.table.status_active);

    // Crisp StatusBadge: neutral pill, the success hue lives on the icon.
    expect(status.querySelector("svg")?.getAttribute("class")).toContain("success");
    expect(status).not.toHaveClass("bg-primary");
  });

  it("shows the insurance type as a neutral tag, not with the brand accent", () => {
    renderTable();

    expect(screen.getByText("Actividades generales")).not.toHaveClass("bg-primary");
  });
});

describe("InsuranceTable provider cell", () => {
  it("truncates the provider inside its own width so it cannot overlap the next column", () => {
    renderTable();

    const provider = screen.getByText(LONG_PROVIDER);

    // Table cells ignore max-width, so the bound and the truncation must live
    // on a block-level child.
    expect(provider).toHaveClass("block", "truncate", "max-w-[140px]");
  });

  it("exposes the full provider name when it is truncated", () => {
    renderTable();

    expect(screen.getByText(LONG_PROVIDER)).toHaveAttribute("title", LONG_PROVIDER);
  });
});

describe("InsuranceTable phone list", () => {
  it("renders each member as a two-line row with one status and the end date", () => {
    renderTable();

    const list = screen.getByRole("list", { name: messages.insurance.table.list_label });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.length).toBeGreaterThan(0);
    expect(within(rows[0]).getAllByText(messages.insurance.table.status_active)).toHaveLength(1);
    expect(within(rows[0]).getByText(/Vence /)).toBeInTheDocument();
  });
});
