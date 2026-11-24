import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import messages from "../../../messages/es.json";

const { error } = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error } }));

import { toastError, useToastError } from "@/lib/feedback/toast-retry";

describe("toastError", () => {
  it("adds a retry action only when onRetry and label are given", () => {
    const onRetry = vi.fn();
    toastError({ title: "Falló", description: "d", onRetry, retryLabel: "Reintentar" });
    const opts = error.mock.calls[0]![1];
    expect(opts.description).toBe("d");
    opts.action.onClick();
    expect(onRetry).toHaveBeenCalled();

    toastError({ title: "Falló" });
    expect(error.mock.calls[1]![1]).toEqual({});
  });

  it("useToastError translates the label", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NextIntlClientProvider locale="es" messages={messages}>
        {children}
      </NextIntlClientProvider>
    );
    const { result } = renderHook(() => useToastError(), { wrapper });
    result.current({ title: "x", onRetry: () => {} });
    expect(error.mock.calls[2]![1].action.label).toBe("Reintentar");
  });
});
