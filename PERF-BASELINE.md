# Performance Baseline — sacdia-admin

**Date:** 2026-05-10
**Branch:** `chore/admin-perf-baseline` (from `origin/development`)
**Build context:** post-PR #119 (development branch)
**Next.js:** 16.2.4 (Turbopack)
**Node:** see `package.json` engines / `pnpm-lock.yaml`

This is the first objective bundle baseline for sacdia-admin after the
deferred-loading wave (PRs #108, #111, #115, #116) and the analyzer setup
(#112). Use it as the reference point for the next perf round.

---

## 1. Tooling Status — `pnpm analyze` (fixed in perf/admin-r4-charts-analyze)

`pnpm analyze` now runs `next experimental-analyze -o` — the Turbopack-native
analyzer built into Next 16. Output lands under `.next/diagnostics/analyze/`
(`analyze.data` per route, `modules.data`, `routes.json`). Launch the
interactive treemap UI with:

```bash
pnpm analyze          # generates .next/diagnostics/analyze/
next experimental-analyze   # serves the UI at http://localhost:4000
```

`@next/bundle-analyzer` has been removed from `package.json` (devDependencies)
and from `next.config.ts` — it is not compatible with Turbopack and produced
no output.

The numbers below were collected by inspecting the **real Turbopack output**
(`.next/static/chunks/*.js` with `gzip -c | wc -c` for transfer sizes) and
the per-route `page_client-reference-manifest.js` dependency lists.

Build artifacts: `.next/static/chunks/` contains 122 `.js` files plus 1 CSS file.

---

## 2. Top 20 client chunks (raw + gzip)

Numbers in bytes. "Used in" = number of `page_client-reference-manifest.js`
files that reference the chunk (proxy for sharedness).

| Rank | Raw    | Gzip   | Chunk                    | Used in routes | Likely contents                           |
| ---: | -----: | -----: | ------------------------ | -------------: | ----------------------------------------- |
|    1 | 423188 | 130190 | `0p6ijvwwtbq-u.js`       |            110 | **react-dom + Next runtime** (rootMain)   |
|    2 | 339107 |  97728 | `0tvhttx4gjnu3.js`       |              2 | **recharts** (SLA + dashboard charts)     |
|    3 | 301091 |  73245 | `0mo_gudr43avp.js`       |             23 | **zod** (shared validators)               |
|    4 | 112594 |  39490 | `03~yq9q893hmn.js`       |            110 | polyfills (rootMain)                      |
|    5 | 111169 |  29628 | `0~yo8z5b45jp_.js`       |            110 | Next/React framework split (rootMain)     |
|    6 |  75093 |  20627 | `0~hsvynr4v2wt.js`       |              1 | annual-folders/categories page            |
|    7 |  73193 |  20504 | `05iz_9ujgg867.js`       |              1 | resources page                            |
|    8 |  69907 |  19508 | `049vkxg1tfz_g.js`       |              1 | finances page                             |
|    9 |  69887 |  20410 | `10fite_y6z.4p.js`       |              1 | clubs/[id] page (cmdk visible)            |
|   10 |  69360 |  19439 | `18515sji~1ph0.js`       |              1 | camporees/[id] page                       |
|   11 |  69062 |  19723 | `12z21uvzmiqhw.js`       |              1 | settings/scoring-categories page          |
|   12 |  67786 |  19371 | `0a.~c34se6o1q.js`       |              1 | catalogs/geography/local-fields/[id]      |
|   13 |  67750 |  19369 | `0rjqx7oz-_~au.js`       |              1 | catalogs/geography/unions/[id]            |
|   14 |  66475 |  19333 | `0xrn_78nijkb1.js`       |              1 | insurance page                            |
|   15 |  65395 |  21292 | `0lrwflxl0yp63.js`       |            105 | shared dashboard layout / sidebar         |
|   16 |  65210 |  18510 | `0q_pn5q3g.8ae.js`       |              1 | achievements/[categoryId]/[id]/edit       |
|   17 |  64598 |  18131 | `0gctl7mzoc01f.js`       |              1 | camporees/union page                      |
|   18 |  64450 |  18041 | `0wj.m9yy0o_xq.js`       |              1 | camporees page                            |
|   19 |  63990 |  18001 | `02z00tbprctef.js`       |              1 | achievements/[categoryId]/new             |
|   20 |  62931 |  17674 | `0pxbyoa8x86an.js`       |              1 | activities/[id] page                      |

**Shared root (`rootMainFiles` from `build-manifest.json`)**

7 files, **701 692 bytes raw / 209 222 bytes gzip** combined.

> Every route pays this transfer up front. The single largest contributor is
> `0p6ijvwwtbq-u.js` (react-dom + Next runtime). The 339 KB recharts chunk is
> NOT in rootMain — it loads only on the 2 routes that statically import it
> (see Recommendation #1).

---

## 3. Per-route initial JS — top 10 routes (sum of all chunks referenced by `page_client-reference-manifest.js`)

| Rank | Raw    | Gzip   | Chunks | Route                                              |
| ---: | -----: | -----: | -----: | -------------------------------------------------- |
|    1 | 893892 | 257632 |     18 | `/dashboard/clubs/[id]`                            |
|    2 | 867802 | 245223 |     17 | `/dashboard/camporees/[id]`                        |
|    3 | 846578 | 241844 |     17 | `/dashboard/annual-folders/templates`              |
|    4 | 834715 | 241424 |     17 | `/dashboard/validation`                            |
|    5 | 830588 | 238727 |     17 | `/dashboard/evidence-review`                       |
|    6 | 830529 | 238029 |     16 | `/dashboard/annual-folders/categories`             |
|    7 | 826518 | 237398 |     16 | `/dashboard/investiture/pipeline`                  |
|    8 | 825343 | 236910 |     16 | `/dashboard/finances`                              |
|    9 | 824471 | 237981 |     17 | `/dashboard/investiture`                           |
|   10 | 821911 | 236735 |     16 | `/dashboard/insurance`                             |

**For comparison:**

- **Lowest route**: `/login` — 249 938 raw / 78 216 gzip (9 chunks).
- Median dashboard route lands around **210–235 KB gzip**.
- Routes that statically use `recharts` (only `/dashboard/sla` and `/dashboard`)
  carry an extra ~98 KB gzip on top.

---

## 4. Verification — deferred components are correctly isolated

PRs #108, #111, #115, #116 wrapped these components in `next/dynamic`:

| PR   | Components dynamically imported                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #108 | First batch — 5 heavy client components (dialogs)                                                                                                            |
| #111 | `AchievementForm`, `TemplatesClientPage`, `RequirementsTree`, `RequirementEditDialog`, `PipelineClientPage`, `ResourcesCrudPage` (~399 KB deferred)          |
| #115 | `PhaseECatalogCrudPage` lazy-loaded from 9 catalog routes                                                                                                    |
| #116 | `RolesTable`, `PhaseECatalogCrudPage` (folder-modules), `RankingsClientPage`, `AwardCategoriesClientPage`, `WeeklyRecordsPanel` (~85–105 KB gzip deferred)   |

**Check**: Searched all 7 `rootMainFiles` chunks for those component names.

```
0p6ijvwwtbq-u.js: 0 hits
0~~5nu0326~ow.js: 0 hits
08f-krk3ed4xj.js: 0 hits
0~yo8z5b45jp_.js: 0 hits
... (all 0)
```

**Confirmed**: no deferred component leaks into the shared root bundle. Each
lives in its own per-route chunk (e.g., `0r13195.l2cvv.js` for
`RankingsClientPage` on `/dashboard/annual-folders/rankings`). The dynamic-
import infrastructure is working as designed.

**Perf round 4 addition (perf/admin-r4-charts-analyze):** `RoleDistributionChart`,
`SlaPipelineChart`, and `SlaThroughputChart` were converted to dynamic imports
(`ssr: false`) with Skeleton placeholders. Each chart file was split into a
thin wrapper (holds `next/dynamic`) and an `*-inner.tsx` (holds the recharts
import). The recharts chunk (~98 KB gzip) is no longer pulled at parse time on
`/dashboard` or `/dashboard/sla`. Expected first-paint saving: ~98 KB gzip on
both routes.

---

## 5. Recommendations — top 5 candidates for the next perf round

Ranked by estimated gzip savings on first paint of the affected routes.

### 1. ~~Lazy-load `recharts` charts on `/dashboard` and `/dashboard/sla` (~98 KB gzip per route)~~ DONE (perf/admin-r4-charts-analyze)

**Finding:** `0tvhttx4gjnu3.js` is **339 KB raw / 97.7 KB gzip** and contains
the recharts library. It's pulled in by exactly two routes:

- `/dashboard` via static import of `RoleDistributionChart`
  (`src/components/dashboard/role-distribution-chart.tsx`).
- `/dashboard/sla` via `sla-dashboard-client.tsx`, which statically imports
  `SlaPipelineChart` and `SlaThroughputChart`.

The home dashboard is the **first page every user lands on after login** —
charts render below-the-fold and are pure visualization. Same for SLA.

**Resolution:** All three charts converted to `next/dynamic` (`ssr: false`) with
Skeleton fallbacks. Each split into wrapper + `*-inner.tsx`. Expected savings:
**~98 KB gzip on `/dashboard` and `/dashboard/sla` first paint.**

### 2. Code-split the shared `zod` chunk (~73 KB gzip on 23 routes)

**Finding:** `0mo_gudr43avp.js` is **301 KB raw / 73 KB gzip**, contains
`zod`, and is referenced by 23 routes (every route that uses a form schema
through the shared validators). It is currently a module-level shared chunk,
not deferred.

**Action:** investigate whether form schemas can be co-located per route /
loaded with the form component itself. Alternatively, evaluate whether
`zod@4` (already in deps per `package.json`) tree-shakes better than the
import surface we're using. Expected: shave 20–40 KB gzip off median dashboard
routes that don't actually need zod at first paint.

### 3. Investigate the 18-chunk `/dashboard/clubs/[id]` route (894 KB raw / 258 KB gzip)

It's the heaviest route in the catalog. Likely candidates inside it: the unit
detail panel, member tables, and catalog forms. PR #116 already deferred
`WeeklyRecordsPanel` from `unit-detail-panel.tsx`, so additional wins live
elsewhere on the page. Audit the static imports in
`src/app/(dashboard)/dashboard/clubs/[id]/page.tsx` and its child components
for further `next/dynamic` candidates (member roster, finance widgets, etc.).

### 4. Audit `/dashboard/annual-folders/templates` (847 KB raw / 242 KB gzip, 17 chunks)

Third-largest route. PR #111 already wrapped `TemplatesClientPage` in
`dynamic()`, so the page-level wrapper is correct. The remaining weight likely
comes from supporting components rendered inside the template editor (rich
text? drag-and-drop?). Re-audit the eagerly-imported helpers around the
dynamic wrapper.

### 5. Replace or defer `cmdk` on `/dashboard/clubs/[id]`

`10fite_y6z.4p.js` (~70 KB raw / 20 KB gzip) is the dominant page-only chunk
on `/dashboard/clubs/[id]` and is the only chunk in the top-25 to contain
`cmdk` strings. Evaluate whether the command palette / combobox can be
deferred (`dynamic(() => import('cmdk'))`) or replaced with a lighter
selector if it's only used in one secondary panel.

---

## 6. Methodology

Commands actually executed in this branch:

```bash
pnpm install --frozen-lockfile         # restore node_modules
pnpm analyze                           # = ANALYZE=true pnpm build
                                       #   → Turbopack build OK, but
                                       #   @next/bundle-analyzer skipped.
npx next experimental-analyze -o       # generates .next/diagnostics/analyze/
                                       # (binary treemap, not text-readable)
```

Sizes computed with:

```bash
# Top chunks (raw + gzip)
ls -S .next/static/chunks/*.js | head -25 | while read f; do
  printf "%9d %9d  %s\n" "$(stat -f%z "$f")" \
    "$(gzip -c "$f" | wc -c)" "$(basename "$f")"
done

# Per-route initial JS = sum of all chunks referenced by
#   .next/server/app/<route>/page_client-reference-manifest.js
```

`gzip -c` uses default compression level (`-6`); a CDN typically uses gzip 6
or brotli (smaller). These numbers are upper-bound for HTTP transfer.

---

## 7. Round 5 (2026-05-10) — zod form-dialog deferred imports

**Branch:** `perf/admin-r5-dynamic` (off `origin/development`)
**Tool:** `pnpm analyze` → `next experimental-analyze -o` → `.next/diagnostics/analyze/data/`
**Method:** parsed `analyze.data` (binary Turbopack format) via Python to extract
`compressed_size` per `(output_file, source)` pair across all routes.

### New finding: 103 KB zod/i18n chunk on form-heavy routes

`0atc2p9c7en0i.js` (**103 KB compressed**) appears on `/dashboard/camporees`,
`/dashboard/evidence-review`, `/dashboard/investiture/pipeline`, and other form-heavy
routes. Sources: `zod.mjs` + all 50+ `zod@4` i18n locale files
(`es.js`, `fr.js`, `zh-TW.js`, etc.) + `@hookform/resolvers/zod` internals.
Root cause: form dialog components import `zodResolver` at the module level,
pulling the entire zod v4 locale bundle into the initial page chunk.

| Route | Chunk saved (compressed) |
|---|---|
| `/dashboard/camporees` | ~103 KB |
| `/dashboard/evidence-review` | ~103 KB |
| `/dashboard/investiture/pipeline` | ~103 KB |

### Components deferred

| File | Dynamic-imported component(s) | Why safe to defer |
|---|---|---|
| `src/components/camporees/camporees-view.tsx` | `CamporeeFormDialog` | Only opened via "Nueva campaña" button click |
| `src/components/evidence-review/evidence-review-table.tsx` | `EvidenceRejectDialog`, `EvidenceBulkActionBar` | Reject dialog requires row action; bulk bar appears after row selection |
| `src/components/investiture/pipeline-table.tsx` | `PipelineRejectDialog`, `BulkActionBar` | Both require user interaction to mount |

### Pattern applied

Direct `next/dynamic({ ssr: false, loading: () => null })` on each dialog
component in its parent client component — no wrapper+inner split needed since
these are already conditionally rendered. Props interfaces exported from each
dialog file for correct generic typing of `dynamic<Props>()`.

### Other findings from R5 analyze run

- **`react-day-picker`** (4.6 MB disk): completely tree-shaken. `calendar.tsx` is
  defined but imported nowhere in the app — zero bundle impact.
- **`recharts`** (`02jltdgb8b9kl.js`, 150 KB compressed): correctly isolated in its
  own lazy chunk, confirming R4 work holds.
- **Largest initial client chunks** (non-framework): `lucide-react` 16.9 KB, 
  `next-intl` client runtime 13.2 KB, `floating-ui` 11.3 KB — all structural,
  cannot be deferred without major refactor.
- **`axios`** (`0kkorn5o_nsv3.js`, 21.9 KB): present on ~50 routes via `src/lib/api/client.ts`.
  Used for all browser-side API calls. Cannot be deferred.

### Verification

- `pnpm typecheck`: PASS
- `pnpm test --run`: 372/372 PASS
- `pnpm lint`: 10 err / 42 warn (unchanged from baseline)

---

## 9. Round 6 (2026-05-10) — clubs/[id] tab-gated and dialog-gated defers

**Branch:** `perf/admin-r6-analyze` (off `origin/development`)
**Worktree:** `.claude/worktrees/agent-perf-r6-2026-05-10`

### Route targeted: `/dashboard/clubs/[id]` (894 KB raw / 258 KB gz, 18 chunks — rank #1)

#### What was identified

`clubs/[id]/page.tsx` is a Server Component that statically imports four heavy client
subtrees. Three are gated behind non-default tabs (`units`, `membership`, `sections`) —
none are visible at first paint. The `view` tab is the only default-visible tab.

| Import | Component chain | Zod/RHF? | Tab visibility |
|---|---|---|---|
| `PendingMembersPanel` | → `PendingMembersTable` → `MembershipRejectDialog` (zod + zodResolver) | YES | `membership` tab |
| `UnitsTab` | → `UnitDetailPanel` → `AddMemberDialog`, `DeleteUnitDialog`; `WeeklyRecordsPanel` already deferred | no | `units` tab |
| `ClubSectionsPanel` | → `MemberOfMonthCard` → `EvaluateMemberOfMonthDialog`, `MemberOfMonthHistorySheet` | no | `sections` tab; dialogs click-gated |

**cmdk** (`10fite_y6z.4p.js`, ~20 KB gz) is present on this route per baseline note.
The cmdk chunk was NOT traced to any direct import in the files audited — likely comes
from a shared combobox used inside `AddMemberDialog` or similar. Deferred `UnitsTab`
removes the static import chain that pulls it in.

#### What was deferred

**Target 1 — `PendingMembersPanel`** (`clubs/[id]/page.tsx`)
- `dynamic(() => import("@/components/membership/pending-members-panel"), { ssr: false })`
- Skeleton loading: 3 row placeholders matching the table row height
- Removes: `@tanstack/react-query` usage in that subtree from initial chunk + the zod
  bundle (`MembershipRejectDialog` uses `zodResolver`) — same 103 KB zod chunk from R5
  that appears on other routes

**Target 2 — `UnitsTab`** (`clubs/[id]/page.tsx`)
- `dynamic(() => import("@/components/units/units-tab"), { ssr: false })`
- Skeleton loading: 3 card-row placeholders matching `UnitsSkeleton` layout
- Removes: `UnitDetailPanel`, `AddMemberDialog`, `DeleteUnitDialog` from initial chunk;
  `WeeklyRecordsPanel` was already deferred inside `UnitDetailPanel` (R4)

**Target 3 — `EvaluateMemberOfMonthDialog` + `MemberOfMonthHistorySheet`** (`member-of-month-card.tsx`)
- Both converted to `dynamic(..., { ssr: false, loading: () => null })`
- Props interfaces exported from each dialog file for correct `dynamic<Props>()` typing
- Removes both dialog subtrees from the `ClubSectionsPanel` → `MemberOfMonthCard`
  static chain; dialogs mount only on button click

#### Pattern applied

- Targets 1 and 2: applied at the Server Component page level — `next/dynamic` is
  valid there; the dynamic wrapper is still rendered by the server but its JS is split
  into a lazy chunk and not parsed at first paint.
- Target 3: applied in the client component `member-of-month-card.tsx`; loading
  state `null` because both dialogs start closed (no visible flash).

#### Estimated gzip savings on `/dashboard/clubs/[id]`

| Deferred chunk content | Estimated gz removed from initial |
|---|---|
| `PendingMembersPanel` + `PendingMembersTable` + `MembershipRejectDialog` (zod) | ~30–40 KB |
| `UnitsTab` + `UnitDetailPanel` + `AddMemberDialog` + `DeleteUnitDialog` | ~15–20 KB |
| `EvaluateMemberOfMonthDialog` + `MemberOfMonthHistorySheet` | ~5–8 KB |
| **Total estimated** | **~50–68 KB gz** on `/dashboard/clubs/[id]` first paint |

The zod removal (Target 1) is the largest single contributor because `MembershipRejectDialog`
pulls the same zod v4 + i18n locale bundle (~103 KB gz) that R5 removed from camporees
and investiture routes. On `/dashboard/clubs/[id]` it was still fully eager.

### Verification

- `pnpm typecheck`: PASS
- `pnpm test --run`: 402/402 PASS
- `pnpm lint`: 10 err / 42 warn (unchanged from baseline)

---

## 10. Round 7 (2026-05-10) — finances and insurance dialog defers + CI build gate

**Branch:** `perf/admin-r7-routes` (off `origin/development`)
**Worktree:** `.claude/worktrees/agent-perf-r7-2026-05-10`

### Routes targeted

| Route | Baseline gz | Rank | Why targeted |
|---|---|---|---|
| `/dashboard/finances` | ~237 KB gz | #8 | `FinancesDashboard` eagerly imports `TransactionFormDialog` (zod + zodResolver) |
| `/dashboard/insurance` | ~237 KB gz | #10 | `InsuranceView` eagerly imports `InsuranceFormDialog` (zod + zodResolver) |

Both routes are Client Component trees — `ssr: false` is valid for all deferred dialogs.

### Components deferred

| Parent file | Component deferred | Zod? | Gate |
|---|---|---|---|
| `src/components/finances/finances-dashboard.tsx` | `TransactionFormDialog` | YES | "Nueva transacción" button click |
| `src/components/finances/finances-dashboard.tsx` | `DeleteTransactionDialog` | no | Delete row action |
| `src/components/insurance/insurance-view.tsx` | `InsuranceFormDialog` | YES | Edit/create member action |
| `src/components/insurance/insurance-view.tsx` | `DeleteInsuranceDialog` | no | Delete row action |

### Pattern applied

`dynamic<Props>(import, { ssr: false, loading: () => null })` in each Client Component
parent. Props interfaces exported from each dialog file (`InsuranceFormDialogProps`,
`DeleteInsuranceDialogProps`, `TransactionFormDialogProps`, `DeleteTransactionDialogProps`)
for correct `dynamic<Props>()` generic typing. Dialogs start closed — `loading: () => null`
produces no visual flash.

### Estimated gz savings

| Route | Removed from initial chunk | Estimated gz saved |
|---|---|---|
| `/dashboard/finances` | `TransactionFormDialog` zod/zodResolver bundle | ~103 KB |
| `/dashboard/insurance` | `InsuranceFormDialog` zod/zodResolver bundle | ~103 KB |
| Both routes | `DeleteTransactionDialog` + `DeleteInsuranceDialog` (smaller) | ~5–10 KB each |

Total estimated: **~103 KB gz per route** on first paint (same zod v4 + i18n locale
chunk isolated in R5 on camporees/evidence-review/investiture routes).

### CI build gate added

**New file:** `.github/workflows/build.yml`

Runs `pnpm build` on every PR targeting `main`, `preproduction`, or `development`.
This catches the critical class of bug fixed in R6 (commit `cb94d33`): `ssr: false`
inside a Server Component passes typecheck and Vitest but fails Vercel build. The new
workflow catches it at PR time, before merge.

Env vars used: `NEXT_PUBLIC_API_URL=http://localhost:3000` (dummy; only needed to resolve
the CSP origin in `next.config.ts`). Sentry DSN is hardcoded as fallback in
`sentry.server.config.ts` — no extra secret needed for build to complete.

### Verification

- `pnpm typecheck`: PASS
- `pnpm test --run`: 432/432 PASS
- `pnpm lint`: unchanged from baseline

---

## 11. Round 8 mega (2026-05-11) — investiture, config, templates, validation dialog defers

**Branch:** `perf/admin-r8-mega` (off `origin/development`, includes #131 + #133)
**Worktree:** `.claude/worktrees/agent-perf-mega-2026-05-11`

### Strategy

Three zod-heavy dialog pairs and one react-query dialog deferred across four routes.
All parent files confirmed as Client Components (`"use client"` present) before applying
`ssr: false`. Props interfaces exported from each dialog file for correct `dynamic<Props>()`
generic typing. Pattern: `dynamic<Props>(import, { ssr: false, loading: () => null })`.

### Routes addressed

| Route | Components deferred | Zod? | Gate |
|---|---|---|---|
| `/dashboard/investiture` | `ValidateDialog`, `InvestidoDialog` | YES (both) | Row action buttons |
| `/dashboard/investiture/config` | `ConfigFormDialog`, `DeleteConfigDialog` | YES (form), no (delete) | Toolbar buttons |
| `/dashboard/annual-folders/templates` | `SectionFormDialog` | YES | "Add section" button inside detail view |
| `/dashboard/validation` | `ValidationHistoryDialog` | no (react-query only) | History row button |

### Files modified

| File | Change |
|---|---|
| `src/components/investiture/validate-dialog.tsx` | Export `ValidateDialogProps` |
| `src/components/investiture/investido-dialog.tsx` | Export `InvestidoDialogProps` |
| `src/components/investiture/config-form-dialog.tsx` | Export `ConfigFormDialogProps` |
| `src/components/investiture/delete-config-dialog.tsx` | Export `DeleteConfigDialogProps` |
| `src/components/annual-folders/section-form-dialog.tsx` | Export `SectionFormDialogProps` |
| `src/components/validation/validation-history-dialog.tsx` | Export `ValidationHistoryDialogProps` |
| `src/components/investiture/pending-table.tsx` | Dynamic import `ValidateDialog` + `InvestidoDialog` |
| `src/components/investiture/config-client-page.tsx` | Dynamic import `ConfigFormDialog` + `DeleteConfigDialog` |
| `src/components/annual-folders/templates-client-page.tsx` | Dynamic import `SectionFormDialog` |
| `src/components/validation/validation-table.tsx` | Dynamic import `ValidationHistoryDialog` |

### Deliberately out of scope (Agent B conflict avoidance)

- `src/components/membership/membership-reject-dialog.tsx` — Agent B's scope
- `src/components/validation/validation-review-dialog.tsx` — Agent B's scope
- `src/components/requests/request-review-dialog.tsx` — Agent B's scope
- `src/components/annual-folders/template-form-dialog.tsx` — Agent B's scope

`ValidationReviewDialog` in `validation-table.tsx` remains eagerly imported to avoid
conflict. `ValidationHistoryDialog` was safely deferred (no overlap with Agent B).

### Estimated gz savings

| Route | Removed from initial chunk | Estimated gz saved |
|---|---|---|
| `/dashboard/investiture` | `ValidateDialog` + `InvestidoDialog` zod/zodResolver bundles | ~50–70 KB |
| `/dashboard/investiture/config` | `ConfigFormDialog` zod/zodResolver bundle | ~50 KB |
| `/dashboard/annual-folders/templates` | `SectionFormDialog` zod/zodResolver bundle | ~20–30 KB |
| `/dashboard/validation` | `ValidationHistoryDialog` (react-query only, smaller) | ~8–15 KB |
| **Total estimated** | | **~128–165 KB gz** across 4 routes |

The dominant savings come from the zod v4 + i18n locale chunk (~103 KB gz) being removed
from the initial load on 3 of the 4 routes — same chunk pattern isolated in R5 and applied
in R6+R7 on other routes.

### Verification

- `pnpm typecheck`: PASS
- `pnpm test --run`: 468/468 PASS
- `pnpm lint`: 10 err / 42 warn (unchanged from baseline — all pre-existing)

---

## 12. Round 9 (2026-05-11) — camporees, union-camporees, system-config, scoring-categories dialog defers

**Branch:** `perf/admin-r9` (off `origin/development`, includes #128 + #131 + #135/136/137)
**Worktree:** `.claude/worktrees/agent-perf-r9-2026-05-11`

### Strategy

Five caller Client Components targeted. All confirmed `"use client"` before applying `ssr: false`.
Props interfaces exported from each dialog/tab file for correct `dynamic<Props>()` generic typing.
Pattern: `dynamic<Props>(import, { ssr: false, loading: () => null })` for dialogs (closed by default),
`loading: () => <Skeleton className="h-48 w-full" />` for tab subtrees that are visible after tab switch.

### Routes addressed

| Route | Components deferred | Zod? | Gate |
|---|---|---|---|
| `/dashboard/camporees/[id]` | `CamporeeMembersTab`, `CamporeeClubsTab`, `CamporeePaymentsTab` | YES (via RegisterMemberDialog, EnrollClubDialog, PaymentDialog) | Non-default tabs |
| `/dashboard/camporees/[id]` | `CamporeeFormDialog`, `DeleteCamporeeDialog` | YES (form) | Edit/delete button click |
| `/dashboard/camporees` (union) | `UnionCamporeeFormDialog`, `DeleteUnionCamporeeDialog` | YES (form) | Create/edit/delete button click |
| `/dashboard/settings/system-config` | `SystemConfigEditDialog` | YES | Edit row action |
| `/dashboard/settings/scoring-categories` (all levels) | `ScoringCategoryDialog`, `ScoringCategoryDeleteDialog` | no | Create/edit/delete button click |

### Files modified

**Props exports added (dialog/tab files):**

| File | Export added |
|---|---|
| `src/components/camporees/enroll-club-dialog.tsx` | `EnrollClubDialogProps` |
| `src/components/camporees/register-member-dialog.tsx` | `RegisterMemberDialogProps` |
| `src/components/camporees/payment-dialog.tsx` | `PaymentDialogProps` |
| `src/components/camporees/delete-camporee-dialog.tsx` | `DeleteCamporeeDialogProps` |
| `src/components/camporees/union-camporee-form-dialog.tsx` | `UnionCamporeeFormDialogProps` |
| `src/components/camporees/delete-union-camporee-dialog.tsx` | `DeleteUnionCamporeeDialogProps` |
| `src/components/system-config/system-config-edit-dialog.tsx` | `SystemConfigEditDialogProps` |
| `src/components/scoring-categories/scoring-category-dialog.tsx` | `ScoringCategoryDialogProps` |
| `src/components/scoring-categories/scoring-category-delete-dialog.tsx` | `ScoringCategoryDeleteDialogProps` |
| `src/components/camporees/camporee-members-tab.tsx` | `CamporeeMembersTabProps` |
| `src/components/camporees/camporee-clubs-tab.tsx` | `CamporeeClubsTabProps` |
| `src/components/camporees/camporee-payments-tab.tsx` | `CamporeePaymentsTabProps` |

**Dynamic imports added (caller files):**

| File | Components deferred |
|---|---|
| `src/components/camporees/camporee-detail-tabs.tsx` | `CamporeeMembersTab`, `CamporeeClubsTab`, `CamporeePaymentsTab` |
| `src/components/camporees/camporee-detail-actions.tsx` | `CamporeeFormDialog`, `DeleteCamporeeDialog` |
| `src/components/camporees/union-camporees-view.tsx` | `UnionCamporeeFormDialog`, `DeleteUnionCamporeeDialog` |
| `src/components/system-config/system-config-client-page.tsx` | `SystemConfigEditDialog` |
| `src/components/scoring-categories/scoring-categories-table.tsx` | `ScoringCategoryDialog`, `ScoringCategoryDeleteDialog` |

### Estimated gz savings

| Route | Removed from initial chunk | Estimated gz saved |
|---|---|---|
| `/dashboard/camporees/[id]` | `CamporeeMembersTab` + `RegisterMemberDialog` (zod) + `CamporeeClubsTab` + `EnrollClubDialog` (zod) + `CamporeePaymentsTab` + `PaymentDialog` (zod) + `CamporeeFormDialog` (zod) + `DeleteCamporeeDialog` | ~80–120 KB |
| `/dashboard/camporees` (union page) | `UnionCamporeeFormDialog` (zod) + `DeleteUnionCamporeeDialog` | ~30–50 KB |
| `/dashboard/settings/system-config` | `SystemConfigEditDialog` (zod) | ~20–30 KB |
| `/dashboard/settings/scoring-categories` | `ScoringCategoryDialog` + `ScoringCategoryDeleteDialog` | ~5–10 KB |
| **Total estimated** | | **~135–210 KB gz** across affected routes |

The dominant savings on `/dashboard/camporees/[id]` (rank #2 at 245 KB gz) come from removing the zod v4 + i18n
locale chunk (~103 KB gz pattern from R5) that was eagerly pulled in via three separate form dialogs on
non-default tabs.

### Verification

- `pnpm typecheck`: PASS
- `pnpm test --run`: 564/564 PASS (45 suites)
- `pnpm lint`: 10 err / 41 warn (pre-existing, unchanged from baseline)

---

## 8. Next actions (handoff)

- ~~Replace `pnpm analyze` script with `next experimental-analyze`~~ DONE.
- ~~Recharts dynamic imports (#1 in §5)~~ DONE (R4).
- ~~zod form-dialog deferred imports (#2 in §5)~~ DONE (R5).
- ~~`/dashboard/clubs/[id]` tab-gated panels~~ DONE (R6).
- ~~`/dashboard/finances` + `/dashboard/insurance` dialog defers~~ DONE (R7).
- **Remaining items**:
  - Audit `/dashboard/annual-folders/templates` remaining eagerly-imported helpers (inner components of the template editor).
  - Evaluate replacing/deferring `cmdk` on any route still carrying it.
  - Regenerate per-route baseline numbers post-R7 to confirm gz savings.
- After the next perf wave, regenerate this baseline and commit a diff so we
  can see savings by route.
