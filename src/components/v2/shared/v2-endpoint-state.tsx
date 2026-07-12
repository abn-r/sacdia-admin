"use client";

import type { ReactNode } from "react";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";

type V2EndpointStateProps = {
  state: "forbidden" | "missing" | "rate-limited";
  detail?: string | null;
  children?: ReactNode;
};

export function V2EndpointState({ state, detail, children }: V2EndpointStateProps) {
  return (
    <div className="space-y-4">
      <EndpointErrorBanner state={state} detail={detail ?? ""} />
      {children}
    </div>
  );
}
