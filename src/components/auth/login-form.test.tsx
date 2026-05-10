/**
 * Integration tests for LoginForm.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The form uses React 19 `useActionState(loginAction, initialState)`.
 * `loginAction` is a Next.js Server Action — it is a plain async
 * function, not an HTTP call. MSW (which intercepts fetch) cannot stub
 * it. Instead we mock the module with `vi.mock("@/lib/auth/actions")`.
 *
 * Vitest hoists `vi.mock(...)` calls to the top of the file automatically,
 * so even though the static import of LoginForm appears before the
 * `vi.mock` in source order, the mock is in effect when the module resolves.
 *
 * The test controls what the action "returns" by resolving to an
 * `AuthActionState` object. The component reflects this state through
 * `state.error` — that is the observable output we assert on.
 *
 * For the redirect path (successful login), the real action calls
 * `redirect()` from `next/navigation` which throws internally.
 * We model success as the action returning `{}` (no error) — matching
 * the real contract where a redirect means the component never applies
 * an updated error state.
 *
 * React 19 + useActionState in jsdom:
 * React 19 sets the native `<form action>` attribute to a JS error
 * URI to prevent accidental native submission. The actual action is
 * triggered via React's synthetic event system. `fireEvent.submit`
 * dispatches a native submit event that React's listener picks up.
 * We wrap it in `act(async () => { ... })` to flush the async state
 * transition before asserting.
 *
 * RTL auto-cleanup:
 * Vitest uses `globals: false`, so `afterEach` is not a global.
 * RTL's auto-cleanup hooks check `typeof afterEach === 'function'` —
 * with globals disabled, that check fails and auto-cleanup is skipped.
 * We explicitly import `cleanup` from RTL and call it in `afterEach`.
 *
 * Intl provider:
 * The component reads translations via `useTranslations("auth.login")`.
 * We wrap the render tree in `NextIntlClientProvider` with the real
 * `messages/es.json` so assertions use actual copy, not stub strings.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { AuthActionState } from "@/lib/auth/types";
import messages from "../../../messages/es.json";

// ---------------------------------------------------------------------------
// Module-level mocks — Vitest hoists vi.mock() calls before imports resolve.
// ---------------------------------------------------------------------------

// Mock Next.js Image — requires a server environment not available in jsdom.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));

// Mock the server action. Individual tests control the resolved value via
// `mockLoginAction.mockResolvedValueOnce(...)`.
const mockLoginAction = vi.fn<
  (state: AuthActionState, formData: FormData) => Promise<AuthActionState>
>();

vi.mock("@/lib/auth/actions", () => ({
  loginAction: (state: AuthActionState, formData: FormData) =>
    mockLoginAction(state, formData),
}));

// Static import after vi.mock declarations — hoisting ensures the mock is
// in effect when this module resolves.
import { LoginForm } from "@/components/auth/login-form";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const authMessages = messages.auth;

/**
 * Wraps LoginForm in the providers it needs.
 * Keeps each test's render call clean.
 */
function renderLoginForm(nextParam = "/dashboard") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <LoginForm nextParam={nextParam} />
    </NextIntlClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LoginForm", () => {
  beforeEach(() => {
    mockLoginAction.mockClear();
    // Default: action completes without error (success / idle path).
    mockLoginAction.mockResolvedValue({});
  });

  // RTL auto-cleanup does not run without globals enabled in Vitest.
  // Explicitly call cleanup after each test to avoid DOM bleed-through.
  afterEach(() => {
    cleanup();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it("renders email field, password field and submit button", () => {
    renderLoginForm();

    expect(
      screen.getByLabelText(authMessages.login.email_label),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(authMessages.login.password_label),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: authMessages.login.submit_idle }),
    ).toBeInTheDocument();
  });

  it("renders welcome title and description", () => {
    renderLoginForm();

    expect(
      screen.getByRole("heading", { name: authMessages.login.welcome_title }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(authMessages.login.welcome_description),
    ).toBeInTheDocument();
  });

  it("email input has type=email with correct autocomplete attribute", () => {
    renderLoginForm();

    const emailInput = screen.getByLabelText(authMessages.login.email_label);
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("autocomplete", "email");
  });

  it("password input starts as type=password (characters hidden)", () => {
    renderLoginForm();

    const passwordInput = screen.getByLabelText(
      authMessages.login.password_label,
    );
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  // ── Password visibility toggle ─────────────────────────────────────────────

  it("toggles password visibility when eye button is clicked", async () => {
    const user = userEvent.setup();

    renderLoginForm();

    const passwordInput = screen.getByLabelText(
      authMessages.login.password_label,
    );
    const showBtn = screen.getByRole("button", {
      name: authMessages.login.show_password,
    });

    // Initially hidden
    expect(passwordInput).toHaveAttribute("type", "password");

    // Click to reveal
    await user.click(showBtn);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: authMessages.login.hide_password }),
    ).toBeInTheDocument();

    // Click to hide again
    await user.click(
      screen.getByRole("button", { name: authMessages.login.hide_password }),
    );

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(
      screen.getByRole("button", { name: authMessages.login.show_password }),
    ).toBeInTheDocument();
  });

  // ── Error state reflected from action ─────────────────────────────────────

  it("shows error alert when loginAction returns invalid credentials error", async () => {
    mockLoginAction.mockResolvedValue({
      error: authMessages.errors.invalid_credentials,
    });

    renderLoginForm();

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        authMessages.errors.invalid_credentials,
      );
    });
  });

  it("shows error alert when loginAction returns server unavailable error", async () => {
    mockLoginAction.mockResolvedValue({
      error: authMessages.errors.server_unavailable,
    });

    renderLoginForm();

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        authMessages.errors.server_unavailable,
      );
    });
  });

  it("shows error alert when user lacks admin role permissions", async () => {
    mockLoginAction.mockResolvedValue({
      error: authMessages.errors.admin_role_required,
    });

    renderLoginForm();

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        authMessages.errors.admin_role_required,
      );
    });
  });

  // ── Successful submission path ─────────────────────────────────────────────

  it("does not show an error alert when loginAction resolves without error (success path)", async () => {
    // Default mock already resolves to {} — this test makes the intent explicit.
    mockLoginAction.mockResolvedValue({});

    renderLoginForm();

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // ── Hidden field ───────────────────────────────────────────────────────────

  it("includes a hidden 'next' input with the value passed via nextParam prop", () => {
    const { container } = renderLoginForm("/dashboard/clubs");

    const hiddenInput = container.querySelector(
      'input[name="next"]',
    ) as HTMLInputElement | null;
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput?.value).toBe("/dashboard/clubs");
  });

  // ── Action invocation ──────────────────────────────────────────────────────

  it("invokes loginAction when the form is submitted", async () => {
    renderLoginForm();

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockLoginAction).toHaveBeenCalledOnce();
    });
  });
});
