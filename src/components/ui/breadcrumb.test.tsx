/**
 * Breadcrumb primitive — BreadcrumbEllipsis srLabel prop tests
 *
 * `BreadcrumbEllipsis` accepts an optional `srLabel` prop (default: "More")
 * that controls the text of the sr-only `<span>`. Unlike Dialog/Sheet, the
 * breadcrumb component uses a plain prop — NOT `useTranslations` — so no
 * NextIntlClientProvider wrapper is required.
 *
 * Tests verify:
 * 1. Default srLabel ("More") renders in the DOM.
 * 2. Custom srLabel renders correctly.
 * 3. The outer span has aria-hidden="true" (screen readers see only the
 *    sr-only child, not the icon).
 * 4. A click handler on a wrapping button fires correctly (ellipsis is
 *    typically placed inside a button/menu trigger in real usage).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

// RTL globals: false → auto-cleanup not registered; do it explicitly.
afterEach(() => cleanup());

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbEllipsis,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

// ---------------------------------------------------------------------------
// Helper — render ellipsis inside a minimal breadcrumb tree
// ---------------------------------------------------------------------------

function renderEllipsis(props: { srLabel?: string; onClick?: () => void } = {}) {
  return render(
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {/*
           * Wrap in a button for click testing. Use data-testid instead of
           * aria-label so the button's accessible name doesn't collide with
           * the sr-only text inside BreadcrumbEllipsis.
           */}
          <button type="button" onClick={props.onClick} data-testid="ellipsis-btn">
            <BreadcrumbEllipsis srLabel={props.srLabel} />
          </button>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Current</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BreadcrumbEllipsis — srLabel prop", () => {
  it("renders default sr-only text 'More' when srLabel is not provided", () => {
    renderEllipsis();
    // The sr-only span text should be accessible in the DOM
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("renders custom srLabel when prop is provided", () => {
    renderEllipsis({ srLabel: "Más páginas" });
    expect(screen.getByText("Más páginas")).toBeInTheDocument();
    // Default "More" should NOT be present
    expect(screen.queryByText("More")).not.toBeInTheDocument();
  });

  it("renders custom English srLabel", () => {
    renderEllipsis({ srLabel: "Show more pages" });
    expect(screen.getByText("Show more pages")).toBeInTheDocument();
  });

  it("ellipsis span has aria-hidden='true' (icon hidden from AT)", () => {
    renderEllipsis();
    const ellipsisSpan = document.querySelector("[data-slot='breadcrumb-ellipsis']");
    expect(ellipsisSpan).toHaveAttribute("aria-hidden", "true");
  });

  it("ellipsis span has role='presentation'", () => {
    renderEllipsis();
    const ellipsisSpan = document.querySelector("[data-slot='breadcrumb-ellipsis']");
    expect(ellipsisSpan).toHaveAttribute("role", "presentation");
  });

  it("surrounding button click handler fires", () => {
    const onClick = vi.fn();
    renderEllipsis({ onClick });
    // Find the button wrapping the ellipsis by its data-testid
    const button = screen.getByTestId("ellipsis-btn");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("nav has aria-label='breadcrumb'", () => {
    renderEllipsis();
    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeInTheDocument();
  });
});
