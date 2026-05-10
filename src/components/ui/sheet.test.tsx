/**
 * Sheet primitive — srLabel / sr-only close button tests
 *
 * `SheetContent` renders a Radix `SheetPrimitive.Close` button that carries
 * a `<span className="sr-only">` whose text comes from
 * `useTranslations("shared.uiPrimitives")("close")`.
 *
 * Tests verify:
 * 1. The sr-only text is present with the default locale translation.
 * 2. A different locale yields the expected translated string.
 * 3. `showCloseButton={false}` hides the button entirely.
 * 4. The close button fires the onOpenChange callback on click.
 * 5. Side variants render (smoke — no crash for each side value).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

// RTL globals: false → auto-cleanup not registered; do it explicitly.
afterEach(() => cleanup());

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./sheet";

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const messagesEn = {
  shared: {
    uiPrimitives: {
      close: "Close",
    },
  },
};

const messagesEs = {
  shared: {
    uiPrimitives: {
      close: "Cerrar",
    },
  },
};

const messagesFr = {
  shared: {
    uiPrimitives: {
      close: "Fermer",
    },
  },
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderSheet(
  locale: string,
  msgs: Record<string, unknown>,
  overrides?: {
    showCloseButton?: boolean;
    side?: "top" | "right" | "bottom" | "left";
    onOpenChange?: (open: boolean) => void;
  },
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={msgs}>
      <Sheet open onOpenChange={overrides?.onOpenChange}>
        <SheetContent
          showCloseButton={overrides?.showCloseButton ?? true}
          side={overrides?.side ?? "right"}
        >
          <SheetHeader>
            <SheetTitle>Test Sheet</SheetTitle>
            <SheetDescription>Sheet description for accessibility</SheetDescription>
          </SheetHeader>
          <p>Sheet body content</p>
        </SheetContent>
      </Sheet>
    </NextIntlClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SheetContent — close button sr-only label", () => {
  it("renders sr-only 'Close' text in English locale", () => {
    renderSheet("en", messagesEn);
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("renders sr-only 'Cerrar' text in Spanish locale", () => {
    renderSheet("es", messagesEs);
    expect(screen.getByText("Cerrar")).toBeInTheDocument();
  });

  it("renders sr-only 'Fermer' text in French locale", () => {
    renderSheet("fr", messagesFr);
    expect(screen.getByText("Fermer")).toBeInTheDocument();
  });

  it("close button is NOT rendered when showCloseButton=false", () => {
    renderSheet("en", messagesEn, { showCloseButton: false });
    expect(screen.queryByText("Close")).not.toBeInTheDocument();
  });

  it("clicking the close button triggers onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    renderSheet("en", messagesEn, { onOpenChange });
    const srSpan = screen.getByText("Close");
    // The close button is the closest button ancestor of the sr-only span
    fireEvent.click(srSpan.closest("button") ?? srSpan);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders without crashing for side='left'", () => {
    renderSheet("en", messagesEn, { side: "left" });
    expect(screen.getByText("Sheet body content")).toBeInTheDocument();
  });

  it("renders without crashing for side='top'", () => {
    renderSheet("en", messagesEn, { side: "top" });
    expect(screen.getByText("Sheet body content")).toBeInTheDocument();
  });

  it("renders without crashing for side='bottom'", () => {
    renderSheet("en", messagesEn, { side: "bottom" });
    expect(screen.getByText("Sheet body content")).toBeInTheDocument();
  });
});
