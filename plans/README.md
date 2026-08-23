# Animation / design plans

Commit stamp: `1d5c22b` (`development`).  
Source: improve-animations audit, user chose the recommended top 5.

| # | Title | Severity | Status | Deps |
| --- | --- | --- | --- | --- |
| 001 | Kill command-palette overlay animation | HIGH | DONE | — |
| 002 | Unify list stagger onto animation tokens | HIGH | DONE | — |
| 003 | Login enter under 300ms with motion tokens | MEDIUM | DONE | — |
| 004 | Tooltip delay on first hover, skip on the next | MEDIUM | DONE | — |
| 005 | Replace sidebar Command icon with SACDIA logo | MEDIUM | DONE | — |

## Execution order

1. `001` — keyboard surface; highest daily frequency.
2. `002` — four list pages; same token pattern.
3. `003` — login only.
4. `004` — global tooltip feel.
5. `005` — brand mark; no motion dependency.

No plan blocks another. Safe to run in that order or in parallel by different executors **except** do not edit `dialog.tsx` from two plans (only `001` touches it).

## Out of scope (audit leftovers)

Accordion `motion-reduce`, ungated hover translates, `DESIGN-SYSTEM.md` §7.1/§9 rewrite, sidebar rail `transition-all`. Do not fold those into these plans.

## How to run

`improve-animations execute plans/00N-….md` or any agent with that file as the only spec. Executor has zero chat context — follow the file verbatim.
