import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../messages/es.json";
import type { ClubDetailPayload } from "@/lib/clubs/types";
import { GeneralTab } from "./general-tab";

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
