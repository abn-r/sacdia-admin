"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type DetailActionResult = { ok?: boolean; error?: string; success?: string };

/**
 * Runs a server action from a dialog: success toasts the server's message and
 * refreshes the page; a failure throws so `ConfirmDialog` (or the caller's
 * form) can show the message in place instead of closing.
 */
export function useDetailAction() {
  const router = useRouter();
  return useCallback(
    async (run: () => Promise<DetailActionResult>) => {
      const result = await run();
      if (result.error) throw new Error(result.error);
      if (result.success) toast.success(result.success);
      router.refresh();
    },
    [router],
  );
}
