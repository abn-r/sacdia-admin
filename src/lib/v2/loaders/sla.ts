import { getSlaDashboard, type SlaDashboard } from "@/lib/api/analytics";

export async function loadSlaDashboard(): Promise<SlaDashboard> {
  return getSlaDashboard();
}
