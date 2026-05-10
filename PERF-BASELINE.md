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

## 1. Tooling Status — `pnpm analyze` blocker (mitigated)

`pnpm analyze` (added in #112) wraps `next build` with the `ANALYZE=true`
env var consumed by `@next/bundle-analyzer`.

> **Blocker:** `@next/bundle-analyzer@16.2.6` is **not compatible with the
> Turbopack production builder** (Next 16 default). The build succeeds, but
> the wrapper prints:
>
> ```
> The Next Bundle Analyzer is not compatible with Turbopack builds, no report will be generated.
> Consider trying the new Turbopack analyzer via `next experimental-analyze`.
> To run this analysis pass the `--webpack` flag to `next build`
> ```
>
> No `.next/analyze/*.html` files are produced. Two workarounds exist:
>
> 1. **`next experimental-analyze -o`** (Next 16 native, Turbopack-compatible).
>    Produces a binary treemap dataset under `.next/diagnostics/analyze/`
>    (`analyze.data` per route, `modules.data`, `routes.json`). Designed for
>    interactive use via `next experimental-analyze` (web UI on :4000). The
>    `analyze.data` files are TTComp/zstd-compressed and parsed in-browser, so
>    they aren't human-greppable from the CLI.
> 2. **`next build --webpack`** to fall back to the legacy Webpack builder so
>    `@next/bundle-analyzer` works as documented. Slower builds; not used in
>    CI today.
>
> **Recommendation:** rewrite the `analyze` script as
> `"analyze": "next experimental-analyze"` and drop `@next/bundle-analyzer`,
> OR keep both: add `analyze:webpack` for the legacy HTML reports.

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

---

## 5. Recommendations — top 5 candidates for the next perf round

Ranked by estimated gzip savings on first paint of the affected routes.

### 1. Lazy-load `recharts` charts on `/dashboard` and `/dashboard/sla` (~98 KB gzip per route)

**Finding:** `0tvhttx4gjnu3.js` is **339 KB raw / 97.7 KB gzip** and contains
the recharts library. It's pulled in by exactly two routes:

- `/dashboard` via static import of `RoleDistributionChart`
  (`src/components/dashboard/role-distribution-chart.tsx`).
- `/dashboard/sla` via `sla-dashboard-client.tsx`, which statically imports
  `SlaPipelineChart` and `SlaThroughputChart`.

The home dashboard is the **first page every user lands on after login** —
charts render below-the-fold and are pure visualization. Same for SLA.

**Action:** wrap `RoleDistributionChart`, `SlaPipelineChart`, and
`SlaThroughputChart` with `dynamic(() => import(...), { ssr: false })` and a
skeleton fallback. Expected savings: **~98 KB gzip on `/dashboard` and
`/dashboard/sla` first paint.**

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

## 7. Next actions (handoff)

- Replace `pnpm analyze` script with `next experimental-analyze` (or add
  parallel `analyze:webpack`) so the script does what its name promises.
- File the 5 follow-up items from §5 as separate perf PRs.
- After the next perf wave, regenerate this baseline and commit a diff so we
  can see savings by route.
