# Animation / design plans

Commit stamp: `f71b8b4` (`development`).  
Source: improve-animations audit. Top 5 shipped in `f71b8b4`. Leftovers 006–008 executed in the same working tree.

| # | Title | Severity | Status | Deps |
| --- | --- | --- | --- | --- |
| 001 | Kill command-palette overlay animation | HIGH | DONE | — |
| 002 | Unify list stagger onto animation tokens | HIGH | DONE | — |
| 003 | Login enter under 300ms with motion tokens | MEDIUM | DONE | — |
| 004 | Tooltip delay on first hover, skip on the next | MEDIUM | DONE | — |
| 005 | Replace sidebar Command icon with SACDIA logo | MEDIUM | DONE | — |
| 006 | Accordion honors prefers-reduced-motion | MEDIUM | DONE | — |
| 007 | Gate hover translates behind pointer:fine | MEDIUM | DONE | — |
| 008 | Align DESIGN-SYSTEM §7.1 and §9 with runtime | LOW | DONE | — |

## Execution order

1. `001`–`005` — already on `origin/development`.
2. `006` — accordion primitive.
3. `007` — login + activities hover.
4. `008` — docs only; no runtime dep.

## Still out of scope

Sidebar rail `transition-all` — settled exemption. Do not re-open.

## How to run

`improve-animations execute plans/00N-….md` or any agent with that file as the only spec. Executor has zero chat context — follow the file verbatim.

Backend (not motion): `009-admin-audit-logs-api.md` — Codex handoff for `GET /admin/audit-logs`.
