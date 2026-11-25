import type { ReactNode } from "react";

import { ConfigurationFrame } from "@/components/configuration/configuration-frame";

export default function Layout({ children }: { children: ReactNode }) {
  return <ConfigurationFrame>{children}</ConfigurationFrame>;
}
