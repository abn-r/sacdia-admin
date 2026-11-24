import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/dashboard/certifications/reviews",
  useSearchParams: () => new URLSearchParams(search),
}));

const reported = vi.hoisted(() => ({
  requirements: (() => {}) as (n: number) => void,
  final: (() => {}) as (n: number) => void,
}));
vi.mock("@/components/certifications/requirement-review-tray", () => ({
  RequirementReviewTray: ({ onCount }: { onCount?: (n: number) => void }) => {
    reported.requirements = onCount ?? (() => {});
    return <div data-testid="requirements-tray" />;
  },
}));
vi.mock("@/components/certifications/final-review-tray", () => ({
  FinalReviewTray: ({ onCount }: { onCount?: (n: number) => void }) => {
    reported.final = onCount ?? (() => {});
    return <div data-testid="final-tray" />;
  },
}));

import { CertificationReviewsClient } from "@/components/certifications/certification-reviews-client";

function renderClient() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CertificationReviewsClient />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  search = "";
});
afterEach(() => cleanup());

describe("CertificationReviewsClient", () => {
  it("shows the requirements tab by default and counts both tabs", () => {
    renderClient();
    expect(screen.getByRole("tab", { name: /Requisitos/ })).toHaveAttribute("aria-selected", "true");
    act(() => {
      reported.requirements(2);
      reported.final(1);
    });
    expect(screen.getByRole("tab", { name: "Requisitos 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Cierres 1" })).toBeInTheDocument();
    expect(screen.getByTestId("requirements-tray").parentElement).not.toHaveAttribute("hidden");
    expect(screen.getByTestId("final-tray").parentElement).toHaveAttribute("hidden");
  });

  it("opens the final closings from the URL", () => {
    search = "tab=final";
    renderClient();
    expect(screen.getByRole("tab", { name: /Cierres/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("final-tray").parentElement).not.toHaveAttribute("hidden");
  });
});
