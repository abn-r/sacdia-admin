# Backend Copy/Paste - Users List Endpoint

## Objetivo
Habilitar listado de usuarios para admin panel en:

- `GET /api/v1/users`
- `GET /api/v1/admin/users` (alias de compatibilidad)

Con:

- paginacion (`page/limit` y `skip/take`)
- busqueda (`q/search/query`)
- filtros (`role`, `status`)
- scope por perfil (`super_admin`, `admin`, `coordinator`)

---

## 1) DTO de query

Archivo:

`src/modules/users/dto/list-users.query.dto.ts`

```ts
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListUsersQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsIn(["active", "inactive", "pending", "approved"])
  status?: "active" | "inactive" | "pending" | "approved";
}
```

---

## 2) Controller principal (`/users`)

Archivo:

`src/modules/users/users.controller.ts`

```ts
import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ListUsersQueryDto } from "./dto/list-users.query.dto";
import { UsersService } from "./users.service";

// Reemplaza estos imports por los de tu proyecto
import { SupabaseGuard } from "../auth/guards/supabase.guard";
import { GlobalRolesGuard } from "../auth/guards/global-roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller({ path: "users", version: "1" })
@UseGuards(SupabaseGuard, GlobalRolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles("super_admin", "admin", "coordinator")
  async listUsers(@Query() query: ListUsersQueryDto, @Req() req: any) {
    return this.usersService.listUsers(query, req.user);
  }
}
```

---

## 3) Controller alias (`/admin/users`)

Archivo:

`src/modules/users/admin-users-alias.controller.ts`

```ts
import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ListUsersQueryDto } from "./dto/list-users.query.dto";
import { UsersService } from "./users.service";

// Reemplaza estos imports por los de tu proyecto
import { SupabaseGuard } from "../auth/guards/supabase.guard";
import { GlobalRolesGuard } from "../auth/guards/global-roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller({ path: "admin/users", version: "1" })
@UseGuards(SupabaseGuard, GlobalRolesGuard)
export class AdminUsersAliasController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles("super_admin", "admin", "coordinator")
  async listUsersAlias(@Query() query: ListUsersQueryDto, @Req() req: any) {
    return this.usersService.listUsers(query, req.user);
  }
}
```

---

## 4) Service con filtros y scope

Archivo:

`src/modules/users/users.service.ts`

```ts
import { ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ListUsersQueryDto } from "./dto/list-users.query.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: ListUsersQueryDto, actor: any) {
    const { take, page, skip, search } = this.normalizePaginationAndSearch(query);

    const actorRoles = this.extractRoles(actor);
    const scopeWhere = this.buildScopeWhere(actor, actorRoles);
    const roleWhere = this.buildRoleWhere(query.role);
    const statusWhere = this.buildStatusWhere(query.status);
    const searchWhere = this.buildSearchWhere(search);

    const where: Prisma.usersWhereInput = {
      AND: [scopeWhere, roleWhere, statusWhere, searchWhere].filter(Boolean) as Prisma.usersWhereInput[],
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.users.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: {
          users_roles: {
            include: {
              roles: true,
            },
          },
        },
      }),
      this.prisma.users.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / take));

    return {
      status: "success",
      data: rows.map((u) => ({
        user_id: u.id,
        email: u.email,
        name: u.name,
        paternal_last_name: u.paternal_last_name,
        maternal_last_name: u.maternal_last_name,
        country_id: (u as any).country_id ?? null,
        union_id: (u as any).union_id ?? null,
        local_field_id: (u as any).local_field_id ?? null,
        district_id: (u as any).district_id ?? null,
        church_id: (u as any).church_id ?? null,
        active: (u as any).active ?? true,
        approval: (u as any).approval ?? null,
        roles: (u.users_roles ?? [])
          .map((ur: any) => ur?.roles?.role_name)
          .filter((v: unknown): v is string => typeof v === "string" && v.length > 0),
        users_roles: (u.users_roles ?? []).map((ur: any) => ({
          roles: { role_name: ur?.roles?.role_name ?? null },
        })),
        created_at: u.created_at,
        updated_at: u.updated_at,
      })),
      meta: {
        pagination: {
          page,
          limit: take,
          total,
          totalPages,
          hasNext: page < totalPages,
        },
      },
    };
  }

  private normalizePaginationAndSearch(query: ListUsersQueryDto) {
    const take = Math.min(query.limit ?? query.take ?? 50, 200);
    const page = query.page ?? (query.skip !== undefined ? Math.floor((query.skip ?? 0) / take) + 1 : 1);
    const skip = query.skip ?? (page - 1) * take;
    const search = (query.q ?? query.search ?? query.query ?? "").trim();
    return { take, page, skip, search };
  }

  private buildSearchWhere(search: string): Prisma.usersWhereInput | null {
    if (!search) {
      return null;
    }

    return {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { paternal_last_name: { contains: search, mode: "insensitive" } },
        { maternal_last_name: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  private buildRoleWhere(role?: string): Prisma.usersWhereInput | null {
    const roleName = (role ?? "").trim();
    if (!roleName) {
      return null;
    }

    return {
      users_roles: {
        some: {
          roles: {
            role_name: roleName,
          },
        },
      },
    };
  }

  private buildStatusWhere(status?: "active" | "inactive" | "pending" | "approved"): Prisma.usersWhereInput | null {
    if (!status) {
      return null;
    }

    if (status === "active") {
      return { active: true as any };
    }

    if (status === "inactive") {
      return { active: false as any };
    }

    if (status === "pending") {
      return {
        OR: [{ approval: 0 as any }, { approval: false as any }, { approval: "pending" as any }],
      };
    }

    return {
      NOT: {
        OR: [{ approval: 0 as any }, { approval: false as any }, { approval: "pending" as any }],
      },
    };
  }

  private extractRoles(actor: any): string[] {
    const roles = new Set<string>();

    const addRole = (value: unknown) => {
      if (typeof value !== "string") return;
      const normalized = value.trim().toLowerCase();
      if (normalized) roles.add(normalized);
    };

    addRole(actor?.role);

    if (Array.isArray(actor?.roles)) {
      actor.roles.forEach(addRole);
    }

    if (Array.isArray(actor?.users_roles)) {
      for (const ur of actor.users_roles) {
        addRole(ur?.roles?.role_name);
      }
    }

    return Array.from(roles);
  }

  private buildScopeWhere(actor: any, roles: string[]): Prisma.usersWhereInput {
    if (roles.includes("super_admin")) {
      return {};
    }

    if (roles.includes("admin")) {
      if (actor?.local_field_id) return { local_field_id: actor.local_field_id };
      if (actor?.union_id) return { union_id: actor.union_id };
      if (actor?.country_id) return { country_id: actor.country_id };
    }

    if (roles.includes("coordinator")) {
      if (actor?.union_id) return { union_id: actor.union_id };
      if (actor?.country_id) return { country_id: actor.country_id };
    }

    if (actor?.id) {
      return { id: actor.id };
    }

    throw new ForbiddenException("No scope available for current profile");
  }
}
```

---

## 5) Modulo users (registrar controller alias)

Archivo:

`src/modules/users/users.module.ts`

```ts
import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { AdminUsersAliasController } from "./admin-users-alias.controller";
import { UsersService } from "./users.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  controllers: [UsersController, AdminUsersAliasController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## 6) Pruebas E2E minimas

Archivo:

`test/users.list.e2e-spec.ts`

```ts
import * as request from "supertest";

describe("Users list endpoint", () => {
  it("GET /api/v1/users -> 401 without token", async () => {
    await request(global.app.getHttpServer()).get("/api/v1/users").expect(401);
  });

  it("GET /api/v1/users -> 200 with super_admin", async () => {
    const res = await request(global.app.getHttpServer())
      .get("/api/v1/users?page=1&limit=10")
      .set("Authorization", `Bearer ${global.tokens.superAdmin}`)
      .expect(200);

    expect(res.body?.status).toBe("success");
    expect(Array.isArray(res.body?.data)).toBe(true);
    expect(res.body?.meta?.pagination).toBeDefined();
  });

  it("GET /api/v1/admin/users -> 200 alias", async () => {
    const res = await request(global.app.getHttpServer())
      .get("/api/v1/admin/users?page=1&limit=10")
      .set("Authorization", `Bearer ${global.tokens.superAdmin}`)
      .expect(200);

    expect(res.body?.status).toBe("success");
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  it("GET /api/v1/users with coordinator token should be scoped by union", async () => {
    const res = await request(global.app.getHttpServer())
      .get("/api/v1/users?limit=100")
      .set("Authorization", `Bearer ${global.tokens.coordinatorUnionA}`)
      .expect(200);

    for (const row of res.body?.data ?? []) {
      expect(String(row.union_id)).toBe(String(global.fixtures.unionAId));
    }
  });
});
```

---

## 7) SQL de indices recomendados

Archivo sugerido:

`prisma/migrations/<timestamp>_users_list_indexes/migration.sql`

```sql
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_country_id ON users(country_id);
CREATE INDEX IF NOT EXISTS idx_users_union_id ON users(union_id);
CREATE INDEX IF NOT EXISTS idx_users_local_field_id ON users(local_field_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
```

---

## 8) Checklist de validacion

1. `GET /api/v1/users` responde `200` con `status`, `data[]` y `meta.pagination`.
2. `GET /api/v1/admin/users` responde el mismo contrato.
3. `super_admin` ve todo.
4. `admin` queda filtrado por `local_field_id` (fallback `union_id`, luego `country_id`).
5. `coordinator` queda filtrado por `union_id` (fallback `country_id`).
6. `q/search/query` funcionan.
7. `role` y `status` funcionan.
8. Sin token responde `401`.

---

## 9) Nota de integracion con frontend actual

El frontend admin ya consume primero `/api/v1/users` y tiene fallback a `/api/v1/admin/users`.  
Si publicas cualquiera de los dos con este contrato, la vista de usuarios debe poblar correctamente.

