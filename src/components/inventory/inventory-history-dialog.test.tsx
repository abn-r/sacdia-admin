/**
 * Integration tests for InventoryHistoryDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Display-only dialog that fetches history via getInventoryHistory()
 * on open (useEffect, cancelled on unmount).
 * `getInventoryHistory` is mocked at module boundary.
 *
 * Key behaviors:
 *   - Shows loading text while fetch is in flight
 *   - Empty state when entries array is []
 *   - Renders CREATE / UPDATE / DELETE entries with translated action labels
 *   - UPDATE entries show old → new value diff
 *   - Error panel rendered when fetch fails
 *   - Fetch NOT triggered when open=false or inventoryId is null
 *
 * Vitest uses `globals: false` — explicit `cleanup()` per `afterEach`.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { InventoryHistoryEntry } from "@/lib/api/inventory";

// ---------------------------------------------------------------------------
// jsdom polyfills
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
const mockGetInventoryHistory = vi.fn<(...args: any[]) => Promise<InventoryHistoryEntry[]>>();

vi.mock("@/lib/api/inventory", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/inventory")>();
  return {
    ...original,
    getInventoryHistory: (...args: unknown[]) => mockGetInventoryHistory(...args),
  };
});

vi.mock("@/lib/format-locale", () => ({
  useFormatDateTime: () => (dateStr: string) => `formatted:${dateStr}`,
}));

import { InventoryHistoryDialog } from "@/components/inventory/inventory-history-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const t = messages.inventory;

const STUB_ENTRIES: InventoryHistoryEntry[] = [
  {
    history_id: 1,
    inventory_id: 55,
    action: "CREATE",
    field_changed: null,
    old_value: null,
    new_value: null,
    created_at: "2026-01-10T09:00:00.000Z",
    performed_by: {
      name: "María",
      paternal_last_name: "López",
    },
  },
  {
    history_id: 2,
    inventory_id: 55,
    action: "UPDATE",
    field_changed: "amount",
    old_value: "5",
    new_value: "10",
    created_at: "2026-02-15T14:00:00.000Z",
    performed_by: {
      name: "Carlos",
      paternal_last_name: "Ruiz",
    },
  },
  {
    history_id: 3,
    inventory_id: 55,
    action: "DELETE",
    field_changed: null,
    old_value: null,
    new_value: null,
    created_at: "2026-03-20T16:00:00.000Z",
    performed_by: null,
  },
];

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  inventoryId?: number | null;
  itemName?: string;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    inventoryId = 55,
    itemName = "Guitarra acústica",
  } = opts;
  const onOpenChange = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InventoryHistoryDialog
        open={open}
        onOpenChange={onOpenChange}
        inventoryId={inventoryId}
        itemName={itemName}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InventoryHistoryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInventoryHistory.mockResolvedValue(STUB_ENTRIES);
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders dialog title and item name ─────────────────────────────────

  it("renders dialog title and item name when open", async () => {
    renderDialog();

    expect(
      screen.getByText(new RegExp(t.history.dialog_title, "i")),
    ).toBeInTheDocument();
    expect(screen.getByText(/Guitarra acústica/)).toBeInTheDocument();
  });

  // ── 2. Not rendered when closed ───────────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    mockGetInventoryHistory.mockResolvedValue([]);
    renderDialog({ open: false });

    expect(
      screen.queryByText(new RegExp(t.history.dialog_title, "i")),
    ).not.toBeInTheDocument();
  });

  // ── 3. Shows loading text while fetching ─────────────────────────────────

  it("shows loading text while getInventoryHistory is pending", async () => {
    let resolve!: (v: InventoryHistoryEntry[]) => void;
    mockGetInventoryHistory.mockReturnValue(
      new Promise<InventoryHistoryEntry[]>((res) => {
        resolve = res;
      }),
    );

    renderDialog();

    expect(screen.getByText(new RegExp(t.history.loading, "i"))).toBeInTheDocument();

    resolve([]);
  });

  // ── 4. Fetch not triggered when open=false ────────────────────────────────

  it("does NOT call getInventoryHistory when open=false", () => {
    renderDialog({ open: false });

    expect(mockGetInventoryHistory).not.toHaveBeenCalled();
  });

  // ── 5. Fetch not triggered when inventoryId is null ──────────────────────

  it("does NOT call getInventoryHistory when inventoryId is null", () => {
    renderDialog({ inventoryId: null });

    expect(mockGetInventoryHistory).not.toHaveBeenCalled();
  });

  // ── 6. Calls getInventoryHistory with correct inventoryId ─────────────────

  it("calls getInventoryHistory with the correct inventoryId", async () => {
    renderDialog({ inventoryId: 42 });

    await waitFor(() => {
      expect(mockGetInventoryHistory).toHaveBeenCalledWith(42);
    });
  });

  // ── 7. Empty state when entries is [] ────────────────────────────────────

  it("renders empty state text when no history entries", async () => {
    mockGetInventoryHistory.mockResolvedValue([]);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(t.history.empty)).toBeInTheDocument();
    });
  });

  // ── 8. Renders CREATE, UPDATE, DELETE action labels ──────────────────────

  it("renders translated action labels for CREATE, UPDATE and DELETE entries", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(t.history.action_create)).toBeInTheDocument();
      expect(screen.getByText(t.history.action_update)).toBeInTheDocument();
      expect(screen.getByText(t.history.action_delete)).toBeInTheDocument();
    });
  });

  // ── 9. UPDATE entry shows old and new values ──────────────────────────────

  it("renders old → new value diff for UPDATE entries", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });
  });

  // ── 10. Performer name shown ─────────────────────────────────────────────

  it("renders performer names from history entries", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(/María López/)).toBeInTheDocument();
      expect(screen.getByText(/Carlos Ruiz/)).toBeInTheDocument();
    });
  });

  // ── 11. System label when performed_by is null ────────────────────────────

  it("shows system label when performed_by is null", async () => {
    renderDialog();

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(t.history.performed_by_system, "i")),
      ).toBeInTheDocument();
    });
  });

  // ── 12. Error panel — shows Error.message when fetch throws ─────────────

  it("renders error panel with Error.message when getInventoryHistory throws", async () => {
    mockGetInventoryHistory.mockRejectedValue(new Error("DB error"));

    renderDialog();

    await waitFor(() => {
      // Component shows err.message for Error instances
      expect(screen.getByText("DB error")).toBeInTheDocument();
    });
  });

  // ── 13. Error panel — i18n fallback for non-Error throws ─────────────────

  it("renders i18n fallback error when getInventoryHistory throws a non-Error", async () => {
    mockGetInventoryHistory.mockRejectedValue({ status: 503 });

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(t.errors.load_history_failed)).toBeInTheDocument();
    });
  });
});
