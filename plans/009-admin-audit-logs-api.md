# 009 — Admin audit-logs API (Codex / backend)

- **Status**: TODO (backend)
- **Commit**: a72a8a0
- **Severity**: HIGH
- **Category**: Contract
- **Estimated scope**: audit-logs module + seeds + docs

Admin UI for the global viewer already ships against this contract
(`/dashboard/configuration/audit`, super-admin only). Club history already
uses `GET /clubs/:clubId/history`.

## Problem

`audit_logs` is write-only at admin scale. No `GET /admin/audit-logs`, no
`audit:read`. Fase 2 in `docs/features/audit-log.md`.

## Target

See the handoff in chat 2026-08-23, summarized:

1. Seed `audit:read` on `super_admin` only.
2. `GET /api/v1/admin/audit-logs` — JWT + `audit:read`. No territorial scope.
3. Query: `entity_type`, `actor_user_id`, `action`, `result`, `source`,
   `from`, `to`, `club_id`, `correlation_id`, `limit` (50 default, 100 cap),
   `cursor` (`audit_log_id` desc).
4. List item: `audit_log_id`, `entity_type`, `entity_id`, `action`, `result`,
   `source`, `summary`, `club_id`, `correlation_id`, `actor`, `created_at`.
   Do **not** include `changes` or `request_context` in the list.
5. Optional `GET /api/v1/admin/audit-logs/:id` with those JSON fields.
6. Do not change `GET /clubs/:clubId/history` (`clubs:read`).
7. `@Audit({ skip: true })` on these GET handlers.
8. No Fase 3 retention in this work.

## Access matrix (agreed)

| Role | Global viewer | Club history |
| --- | --- | --- |
| `super_admin` | yes | yes |
| `admin` | no (403 on `/admin/audit-logs`) | yes if `clubs:read` |
| others | no | only with `clubs:read` |

## Docs

- `docs/features/audit-log.md` Fase 2 → done
- `docs/api/ENDPOINTS-LIVE-REFERENCE.md`
- `docs/features/rbac.md`

## Verification

- super_admin lists and filters
- admin 403 on global, 200 on club history
- GET audit does not insert `audit_logs` rows
- list never returns request bodies
