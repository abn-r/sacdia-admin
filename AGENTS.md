# SACDIA Admin — AGENTS.md

Adaptador GGA para `sacdia-admin`.
La fuente de verdad operativa es `../AGENTS.md` cuando este repo se trabaja dentro del workspace `sacdia`.

## Orden obligatorio de lectura

1. `../AGENTS.md` si existe.
2. `./CLAUDE.md`.
3. `../docs/README.md`.
4. `../docs/steering/tech.md`.
5. `../docs/steering/coding-standards.md`.
6. `../docs/steering/data-guidelines.md`.
7. `../docs/api/FRONTEND-INTEGRATION-GUIDE.md`.
8. `../docs/api/ENDPOINTS-LIVE-REFERENCE.md`.
9. `../docs/features/` del dominio afectado.

Si el repo esta abierto aislado y `../AGENTS.md` no existe, usar este archivo como minimo operativo y pedir/recuperar el contexto del workspace antes de cambios transversales.

## Regla de workflow (Cursor)

Regla persistente: `.cursor/rules/admin-panel-workflow.mdc` (`alwaysApply: true`).

- **Pantallas nuevas**: consultar docs del dominio (`../docs/features/`), API (`ENDPOINTS-LIVE-REFERENCE.md`, `FRONTEND-INTEGRATION-GUIDE.md`) y `DESIGN-SYSTEM.md` antes de implementar.
- **Backend**: no modificar `sacdia-backend` desde este repo. Entregar handoff implementable al usuario (ver `../AGENTS.md` → *Handoff backend*). Otra IA (Codex) implementa backend; este agente solo admin + consumo API.
- **Datos**: verificar endpoints, campos, permisos y tipos en docs y código backend efectivo; no asumir contratos.

## Reglas admin

- Next.js App Router: server components por defecto; `'use client'` solo cuando sea necesario.
- Auth via backend API y cookies HTTP-only; no reintroducir Supabase client/server.
- Formularios con React Hook Form + Zod cuando aplique.
- No ejecutar build salvo pedido explicito del usuario.
- Si cambia un flujo funcional o consumo API, actualizar docs de feature/API en el mismo trabajo.

## Design system (DESIGN-SYSTEM.md)

Checklist antes de merge en cambios de UI:

- [ ] Titulos de pagina via `<PageHeader>` (no `h1` sueltos con `font-bold`)
- [ ] Colores con tokens semanticos (`bg-primary`, `text-muted-foreground`, etc.)
- [ ] Componentes interactivos desde `@/components/ui/*`
- [ ] Strings de UI en `messages/*.json` (4 idiomas + `messages.d.ts`)
- [ ] `pnpm audit:design-system` sin errores en modo strict

```bash
pnpm audit:design-system          # reporte
pnpm audit:design-system --strict # falla en errores (h1 font-bold, etc.)
```

