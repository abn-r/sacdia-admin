/**
 * Dialog primitive — srLabel / sr-only close button tests
 *
 * `DialogContent` renders a Radix `DialogPrimitive.Close` button that carries
 * a `<span className="sr-only">` whose text comes from
 * `useTranslations("shared.uiPrimitives")("close")`.
 *
 * Tests verify:
 * 1. The sr-only text is present with the default locale translation.
 * 2. A different locale yields the expected translated string.
 * 3. The dialog can be dismissed via the close button (callback fires).
 * 4. `showCloseButton={false}` hides the button entirely.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

// RTL globals: false → auto-cleanup not registered; do it explicitly.
afterEach(() => cleanup());

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./dialog";

// ---------------------------------------------------------------------------
// Messages — only the keys consumed by dialog.tsx
// ---------------------------------------------------------------------------

const messages = {
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

// ---------------------------------------------------------------------------
// Helper: render an open dialog wrapped with the intl provider
// ---------------------------------------------------------------------------

function renderDialog(
  locale: string,
  msgs: Record<string, unknown>,
  overrides?: { showCloseButton?: boolean },
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={msgs}>
      {/* open={true} keeps the content in the DOM without needing a trigger */}
      <Dialog open>
        <DialogContent showCloseButton={overrides?.showCloseButton ?? true}>
          <DialogTitle>Test dialog</DialogTitle>
          <DialogDescription>Description for accessibility</DialogDescription>
          <p>Dialog body</p>
        </DialogContent>
      </Dialog>
    </NextIntlClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DialogContent — close button sr-only label", () => {
  it("renders sr-only 'Close' text in English locale by default", () => {
    renderDialog("en", messages);
    // The sr-only span is in the DOM even though it is visually hidden
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("renders sr-only 'Cerrar' text in Spanish locale", () => {
    renderDialog("es", messagesEs);
    expect(screen.getByText("Cerrar")).toBeInTheDocument();
  });

  it("close button is present in the DOM with showCloseButton=true (default)", () => {
    renderDialog("en", messages);
    // The close button wraps an XIcon + the sr-only span.
    // We can locate it via the data-slot attribute.
    const closeBtn = document.querySelector("[data-slot='dialog-close']");
    expect(closeBtn).toBeInTheDocument();
  });

  it("close button is NOT rendered when showCloseButton=false", () => {
    renderDialog("en", messages, { showCloseButton: false });
    // "Close" sr-only text should be absent
    expect(screen.queryByText("Close")).not.toBeInTheDocument();
  });

  it("clicking the close button triggers the Dialog's onOpenChange", () => {
    const onOpenChange = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogContent>
        </Dialog>
      </NextIntlClientProvider>,
    );

    // Find the sr-only close text and click its parent button
    const srSpan = screen.getByText("Close");
    fireEvent.click(srSpan.closest("button") ?? srSpan);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
