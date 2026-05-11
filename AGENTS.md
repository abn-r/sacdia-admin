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

## Reglas admin

- Next.js App Router: server components por defecto; `'use client'` solo cuando sea necesario.
- Auth via backend API y cookies HTTP-only; no reintroducir Supabase client/server.
- Formularios con React Hook Form + Zod cuando aplique.
- No ejecutar build salvo pedido explicito del usuario.
- Si cambia un flujo funcional o consumo API, actualizar docs de feature/API en el mismo trabajo.

