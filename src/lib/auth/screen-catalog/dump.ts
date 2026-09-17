/**
 * Serializes app-surface screens + role aliases for the Flutter sibling.
 * Regen fixture: fail `screen-catalog.app.test.ts` and copy `dumpAppCatalog()`
 * into `sacdia-app/test/fixtures/screen-catalog.snapshot.json`, then update
 * `sacdia-app/lib/core/authorization/screen_catalog.dart`.
 */
import { SCREEN_CATALOG } from "./index";
import { GLOBAL_ROLE_ALIASES } from "./role-aliases";
import type { CapabilityGate, ScreenCapability, ScreenDefinition } from "./types";

export type CatalogDumpGate = {
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
  exactRoles?: boolean;
};

export type CatalogDumpCapability = {
  id: string;
  kind: string;
  gate: CatalogDumpGate;
};

export type CatalogDumpScreen = {
  id: string;
  surfaces: string[];
  viewAny: CatalogDumpGate;
  capabilities: CatalogDumpCapability[];
};

export type CatalogDump = {
  version: 1;
  aliases: Record<string, readonly string[]>;
  screens: CatalogDumpScreen[];
};

function dumpGate(gate: CapabilityGate): CatalogDumpGate {
  const out: CatalogDumpGate = {};
  if (gate.permissions && gate.permissions.length > 0) {
    out.permissions = [...gate.permissions].sort();
  }
  if (gate.roles && gate.roles.length > 0) {
    out.roles = [...gate.roles];
  }
  if (gate.requireAll) out.requireAll = true;
  if (gate.exactRoles) out.exactRoles = true;
  return out;
}

function dumpCapability(capability: ScreenCapability): CatalogDumpCapability {
  return {
    id: capability.id,
    kind: capability.kind,
    gate: dumpGate(capability.gate),
  };
}

function dumpScreen(screen: ScreenDefinition): CatalogDumpScreen {
  return {
    id: screen.id,
    surfaces: [...screen.surfaces].sort(),
    viewAny: dumpGate(screen.viewAny),
    capabilities: [...screen.capabilities]
      .map(dumpCapability)
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

/** App-surface screens + alias table. Source of truth for the Flutter sibling. */
export function dumpAppCatalog(): CatalogDump {
  const aliases = Object.fromEntries(
    Object.entries(GLOBAL_ROLE_ALIASES).sort(([a], [b]) => a.localeCompare(b)),
  );
  const screens = SCREEN_CATALOG.filter((screen) =>
    screen.surfaces.includes("app"),
  )
    .map(dumpScreen)
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  return { version: 1, aliases, screens };
}

export function dumpAppCatalogJson(): string {
  return `${JSON.stringify(dumpAppCatalog(), null, 2)}\n`;
}
