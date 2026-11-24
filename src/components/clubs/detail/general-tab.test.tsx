import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import messages from "../../../../messages/es.json";
import type { ClubDetailPayload } from "@/lib/clubs/types";
import { GeneralTab } from "./general-tab";
import { buildClubDetail } from "./detail-test-data";

function renderTab(description: string | null) {
  // Only `club` and `sectionMemberGroups` are read by the tab.
  const data = {
    club: { club_id: 7, name: "Club Águilas", active: true, description },
    sectionMemberGroups: [],
  } as unknown as ClubDetailPayload;

  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <GeneralTab data={data} />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe("GeneralTab description", () => {
  it("shows the club description with its line breaks", () => {
    renderTab("Primera línea\nSegunda línea");

    expect(screen.getByText(messages.clubs.detail.general.labelDescription)).toBeInTheDocument();
    const value = screen.getByText(/Primera línea/);
    expect(value).toHaveClass("whitespace-pre-line");
    expect(value.textContent).toBe("Primera línea\nSegunda línea");
  });

  it("shows a placeholder when the club has no description", () => {
    renderTab("   ");

    const label = screen.getByText(messages.clubs.detail.general.labelDescription);
    expect(label.nextElementSibling?.textContent).toBe("—");
  });
});

describe("GeneralTab sections", () => {
  it("shows the club data and one row per section, not every member", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <GeneralTab data={buildClubDetail()} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Datos del club")).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Conquistadores");
    expect(rows[0]).toHaveTextContent("Mateo Herrera");
    // Members have their own tab.
    expect(screen.queryByText("Iker Montes")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Ver sección" })[0]).toHaveAttribute(
      "href",
      "/dashboard/clubs/7?tab=sections&section=11",
    );
  });

  it("marks only the exception: a disabled section, not the enabled ones", () => {
    const data = buildClubDetail();
    const [first, second] = data.sectionMemberGroups;
    if (!first || !second) throw new Error("fixture");
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <GeneralTab data={{ ...data, sectionMemberGroups: [first, { ...second, active: false }] }} />
      </NextIntlClientProvider>,
    );

    expect(screen.getAllByText("Deshabilitada")).toHaveLength(1);
    expect(screen.queryByText("Habilitada")).not.toBeInTheDocument();
  });
});
