/**
 * Integration tests for EnrollClubDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Dialog is a 2-step Select (Club -> Section):
 *   1. On open: fetches clubs scoped to `localFieldId` via `listClubs`.
 *   2. On club pick: fetches sections via `getClubSections(clubId)`.
 *   3. Sections filtered by camporee's `includes_*` flags
 *      (adventurers / pathfinders / master_guides).
 *   4. Submit calls `enrollClub(camporeeId, { club_section_id })`.
 *
 * Radix Select renders into a portal and uses pointer events that jsdom
 * does not fully simulate, so option clicks are flaky in this harness.
 * The tests below focus on the contracts that are observable without
 * driving the Radix popover:
 *   - Title / description render.
 *   - Submit button is disabled until both selects have values.
 *   - listClubs is called with the expected localFieldId scope on open.
 *   - Section fetch only runs after a club is selected.
 *   - Cancel triggers onOpenChange(false) without calling the API.
 *
 * Vitest uses `globals: false` — explicit `cleanup()` per `afterEach`.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

// ---------------------------------------------------------------------------
// jsdom polyfills (Radix Dialog/Select use ResizeObserver + scrollIntoView)
// ---------------------------------------------------------------------------

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockEnrollClub = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/camporees", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporees")>();
  return {
    ...original,
    enrollClub: (...args: unknown[]) => mockEnrollClub(...args),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListClubs = vi.fn<(...args: any[]) => Promise<unknown>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetClubSections = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/clubs", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/clubs")>();
  return {
    ...original,
    listClubs: (...args: unknown[]) => mockListClubs(...args),
    getClubSections: (...args: unknown[]) => mockGetClubSections(...args),
  };
});

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
  },
}));

import { EnrollClubDialog } from "@/components/camporees/enroll-club-dialog";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const t = messages.camporees;
const CAMPOREE_ID = 7;
const LOCAL_FIELD_ID = 11;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  camporeeId?: number;
  localFieldId?: number | null;
  includesAdventurers?: boolean;
  includesPathfinders?: boolean;
  includesMasterGuides?: boolean;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    camporeeId = CAMPOREE_ID,
    localFieldId = LOCAL_FIELD_ID,
    includesAdventurers = true,
    includesPathfinders = true,
    includesMasterGuides = false,
  } = opts;
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EnrollClubDialog
        open={open}
        onOpenChange={onOpenChange}
        camporeeId={camporeeId}
        localFieldId={localFieldId}
        includesAdventurers={includesAdventurers}
        includesPathfinders={includesPathfinders}
        includesMasterGuides={includesMasterGuides}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EnrollClubDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnrollClub.mockResolvedValue({ ok: true });
    mockListClubs.mockResolvedValue([
      { club_id: 101, name: "Club Alfa", local_field_id: LOCAL_FIELD_ID, church_id: 1, active: true },
      { club_id: 102, name: "Club Beta", local_field_id: LOCAL_FIELD_ID, church_id: 2, active: true },
    ]);
    mockGetClubSections.mockResolvedValue([
      {
        club_section_id: 5001,
        active: true,
        name: "Aventureros A",
        club_type_id: 1,
        club_types: { club_type_id: 1, name: "Aventureros" },
      },
      {
        club_section_id: 5002,
        active: true,
        name: "Conquistadores B",
        club_type_id: 2,
        club_types: { club_type_id: 2, name: "Conquistadores" },
      },
      {
        club_section_id: 5003,
        active: true,
        name: "GM",
        club_type_id: 3,
        club_types: { club_type_id: 3, name: "Guías Mayores" },
      },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Title and description ─────────────────────────────────────────────

  it("renders dialog title and description", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: t.enrollDialog.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(t.enrollDialog.description),
    ).toBeInTheDocument();
  });

  // ── 2. Closed dialog does not render content ─────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: t.enrollDialog.title }),
    ).not.toBeInTheDocument();
  });

  // ── 3. listClubs is called on open with localFieldId scope ───────────────

  it("fetches clubs scoped to localFieldId when opened", async () => {
    renderDialog();

    await waitFor(() => {
      expect(mockListClubs).toHaveBeenCalledTimes(1);
    });

    const arg = mockListClubs.mock.calls[0][0] as {
      localFieldId?: number;
      active?: boolean;
    };
    expect(arg.localFieldId).toBe(LOCAL_FIELD_ID);
    expect(arg.active).toBe(true);
  });

  // ── 4. Section fetch does not run before a club is selected ──────────────

  it("does not call getClubSections until a club is picked", async () => {
    renderDialog();

    await waitFor(() => {
      expect(mockListClubs).toHaveBeenCalled();
    });

    // No club selected → section endpoint must remain untouched.
    expect(mockGetClubSections).not.toHaveBeenCalled();
  });

  // ── 5. Submit button is disabled until both selects have values ──────────

  it("submit button is disabled until both selects have values", () => {
    renderDialog();

    const submit = screen.getByRole("button", { name: t.enrollDialog.enroll });
    expect(submit).toBeDisabled();
  });

  // ── 6. Cancel triggers onOpenChange(false) without API call ──────────────

  it("calls onOpenChange(false) without calling enrollClub when cancel clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(
      screen.getByRole("button", { name: t.enrollDialog.cancel }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockEnrollClub).not.toHaveBeenCalled();
  });

  // ── 7. Empty clubs response renders the empty-state copy ─────────────────

  it("shows empty-clubs message when listClubs returns no clubs", async () => {
    mockListClubs.mockResolvedValueOnce([]);
    renderDialog();

    await waitFor(() => {
      expect(
        screen.getByText(t.enrollDialog.emptyClubs),
      ).toBeInTheDocument();
    });
  });

  // ── 8. Paginated response shape is unwrapped ─────────────────────────────

  it("accepts paginated { data: [...] } club response shape", async () => {
    mockListClubs.mockResolvedValueOnce({
      data: [
        { club_id: 201, name: "Club Gamma", local_field_id: LOCAL_FIELD_ID, church_id: 3, active: true },
      ],
      meta: { page: 1, limit: 200, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });
    renderDialog();

    await waitFor(() => {
      expect(mockListClubs).toHaveBeenCalled();
    });

    // No empty-state copy → indicates the wrapper was parsed.
    expect(
      screen.queryByText(t.enrollDialog.emptyClubs),
    ).not.toBeInTheDocument();
  });
});
