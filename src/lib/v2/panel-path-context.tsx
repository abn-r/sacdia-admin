"use client";

import { createContext, useContext } from "react";
import { toV2Path, toV1Path } from "@/lib/v2/route-map";

type PanelPathContextValue = {
  variant: "v1" | "v2";
  toPanelPath: (path: string) => string;
};

const PanelPathContext = createContext<PanelPathContextValue>({
  variant: "v1",
  toPanelPath: (path) => path,
});

export function V2PanelPathProvider({ children }: { children: React.ReactNode }) {
  return (
    <PanelPathContext.Provider
      value={{
        variant: "v2",
        toPanelPath: (path) => {
          if (path.startsWith("/v2/dashboard")) return path;
          if (path.startsWith("/dashboard")) return toV2Path(path);
          return path;
        },
      }}
    >
      {children}
    </PanelPathContext.Provider>
  );
}

export function V1PanelPathProvider({ children }: { children: React.ReactNode }) {
  return (
    <PanelPathContext.Provider
      value={{
        variant: "v1",
        toPanelPath: (path) => {
          if (path.startsWith("/v2/dashboard")) return toV1Path(path);
          return path;
        },
      }}
    >
      {children}
    </PanelPathContext.Provider>
  );
}

export function usePanelPath() {
  return useContext(PanelPathContext);
}
