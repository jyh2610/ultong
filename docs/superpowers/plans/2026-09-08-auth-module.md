# Auth Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Auth domain module for `apps/api` — local (email/password) signup+login and Kakao SDK-token login, both issuing our own JWT access token + DB-tracked, rotating refresh token.

**Architecture:** Standard NestJS module (`AuthModule`) composed of small single-purpose services (`PasswordService` for hashing, `TokenService` for issuing/rotating/revoking tokens, `KakaoService` for verifying Kakao tokens) plus a thin `UsersModule` that Auth depends on for user lookups/creation. A Passport JWT strategy + guard protect authenticated routes. All DB access goes through the existing global `PrismaService`.

**Tech Stack:** NestJS 11, Prisma 7 (Postgres), `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt` for JWT, `bcryptjs` for password hashing (pure JS — no native build step, keeps the existing hardened Dockerfile working), Node 18+ built-in `fetch` for the Kakao API call (no new HTTP client dependency).

**Spec:** `docs/superpowers/specs/2026-09-08-auth-module-design.md`

## Global Constraints

- DTOs are classes with `class-validator` decorators (never plain `interface`/`type`) — the global `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })` in `src/main.ts` depends on this.
- Every new controller/DTO gets `@ApiTags`/`@ApiProperty`/`@ApiBearerAuth` so it shows up in the `/docs` Swagger UI (`apps/api/CLAUDE.md`).
- No new HTTP client or bcrypt-native dependency — use built-in `fetch` and `bcryptjs` (pure JS) per the spec's YAGNI call and to avoid re-breaking the Dockerfile hardening work already done.
- Refresh tokens are never stored raw in the DB — only a SHA-256 hash (spec, "토큰 전략").
- `apps/api/.env` currently points `DATABASE_URL` at the shared remote dev Postgres (`34.133.19.171/mungroad`) — this is the only DB in play; local Postgres is stopped and out of scope for this work.
- Unit test files live under `src/**/*.spec.ts` (Jest `rootDir` is `src`); e2e specs live under `test/*.e2e-spec.ts`.

---

## Task 1: Add auth dependencies and JWT env vars

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/.env` (gitignored — not committed)

**Interfaces:**
- Produces: the packages `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcryptjs` importable from any file in later tasks; the env vars `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` readable via `ConfigService`.

- [ ] **Step 1: Add the dependencies**

Run from `apps/api/`:

```bash
cd apps/api
yarn add @nestjs/jwt@^12.0.1 @nestjs/passport@^12.0.0 passport@^0.7.0 passport-jwt@^4.0.1 bcryptjs@^3.0.3
yarn add -D @types/passport-jwt@^4.0.1
```

(Run this from `apps/api/` specifically, not the repo root — per root `CLAUDE.md`, workspace deps are added from within the workspace folder even though the actual install/hoisting happens through the root lockfile.)

- [ ] **Step 2: Verify the install**

Run: `yarn typecheck` (from `apps/api/`)
Expected: passes with no errors (nothing imports the new packages yet, this just confirms `yarn.lock`/`node_modules` resolved cleanly).

- [ ] **Step 3: Add JWT env vars**

Generate a real local secret and append to `apps/api/.env`:

```bash
echo "JWT_ACCESS_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')" >> .env
echo "JWT_ACCESS_EXPIRES_IN=1h" >> .env
echo "JWT_REFRESH_EXPIRES_IN=30d" >> .env
```

Append placeholders to `apps/api/.env.example`:

```
JWT_ACCESS_SECRET=change-me
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json apps/api/yarn.lock apps/api/.env.example
git commit -m "chore: add auth dependencies and JWT env vars"
```

(`apps/api/.env` is gitignored — do not add it.)

---

## Task 2: Add the `refresh_tokens` table

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_refresh_tokens/migration.sql` (generated, not hand-written)

**Interfaces:**
- Produces: Prisma model `RefreshToken` with client accessor `prisma.refreshToken`, fields `id: bigint`, `userId: bigint`, `tokenHash: string`, `expiresAt: Date`, `revokedAt: Date | null`, `createdAt: Date`. `User.refreshTokens: RefreshToken[]` back-relation.

- [ ] **Step 1: Add the model to `schema.prisma`**

Add this model at the end of the file, and add the back-relation to `User`:

```prisma
model RefreshToken {
  id        BigInt    @id @default(autoincrement())
  userId    BigInt    @map("user_id")
  tokenHash String    @unique @map("token_hash") @db.VarChar(255)
  expiresAt DateTime  @map("expires_at") @db.Timestamptz
  revokedAt DateTime? @map("revoked_at") @db.Timestamptz
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}
```

In the existing `model User { ... }` block, add this line alongside the other back-relations (`pets`, `favorites`, `reports`, `courses`):

```prisma
  refreshTokens RefreshToken[]
```

- [ ] **Step 2: Generate and apply the migration**

The remote dev DB (`34.133.19.171/mungroad`, user `ultong`) has `CREATEDB`+superuser, so `migrate dev` can run directly against it — no local Postgres needed.

Run from `apps/api/`:

```bash
npx prisma migrate dev --name add_refresh_tokens
```

Expected output ends with: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify the table**

```bash
PGPASSWORD='REDACTED_DB_PASSWORD' psql "host=34.133.19.171 port=5432 dbname=mungroad user=ultong sslmode=prefer" -c "\d refresh_tokens"
```

Expected: shows columns `id, user_id, token_hash, expires_at, revoked_at, created_at`, a unique index on `token_hash`, an index on `user_id`, and an FK to `users(id)` with `ON DELETE CASCADE`.

- [ ] **Step 4: Regenerate the Prisma client and typecheck**

```bash
npx prisma generate
yarn typecheck
```

Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat: add refresh_tokens table for auth token rotation"
```

---

## Task 3: `PasswordService`

**Files:**
- Create: `apps/api/src/auth/password.service.ts`
- Test: `apps/api/src/auth/password.service.spec.ts`

**Interfaces:**
- Produces: `PasswordService.hash(plain: string): Promise<string>`, `PasswordService.compare(plain: string, hash: string): Promise<boolean>`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/auth/password.service.spec.ts
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashes a password to something other than the plaintext', async () => {
    const hash = await service.hash('correct horse battery staple');
    expect(hash).not.toBe('correct horse battery staple');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('compare() returns true for the matching plaintext', async () => {
    const hash = await service.hash('correct horse battery staple');
    await expect(service.compare('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('compare() returns false for a wrong plaintext', async () => {
    const hash = await service.hash('correct horse battery staple');
    await expect(service.compare('wrong password', hash)).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test password.service -- --verbose` (from `apps/api/`)
Expected: FAIL — `Cannot find module './password.service'`

- [ ] **Step 3: Write the implementation**

```typescript
// apps/api/src/auth/password.service.ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordService {
  private readonly saltRounds = 10;

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test password.service -- --verbose`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/password.service.ts apps/api/src/auth/password.service.spec.ts
git commit -m "feat: add PasswordService for bcrypt hashing"
```

---

## Task 4: `UsersModule` / `UsersService`

**Files:**
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/users.service.ts`
- Test: `apps/api/src/users/users.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (from `../prisma/prisma.service`, already global via `PrismaModule`) — specifically `prisma.user.findFirst` and `prisma.user.create`.
- Produces: `UsersService.findByEmail(email: string): Promise<User | null>`, `UsersService.findByProviderUid(provider: AuthProvider, providerUid: string): Promise<User | null>`, `UsersService.createLocal(params: { email: string; passwordHash: string; nickname: string }): Promise<User>`, `UsersService.createOAuth(params: { provider: AuthProvider; providerUid: string; nickname: string }): Promise<User>`. `UsersModule` exports `UsersService`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UsersService);
  });

  it('findByEmail() looks up an active (non-deleted) user by email', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 1n, email: 'a@b.com' });

    const result = await service.findByEmail('a@b.com');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'a@b.com', deletedAt: null },
    });
    expect(result).toEqual({ id: 1n, email: 'a@b.com' });
  });

  it('findByProviderUid() looks up a user by provider + providerUid', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 2n, provider: AuthProvider.kakao });

    const result = await service.findByProviderUid(AuthProvider.kakao, 'kakao-123');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { provider: AuthProvider.kakao, providerUid: 'kakao-123' },
    });
    expect(result).toEqual({ id: 2n, provider: AuthProvider.kakao });
  });

  it('createLocal() creates a local-provider user', async () => {
    prisma.user.create.mockResolvedValue({ id: 3n });

    await service.createLocal({
      email: 'a@b.com',
      passwordHash: 'hashed',
      nickname: '멍냥이',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        provider: AuthProvider.local,
        email: 'a@b.com',
        passwordHash: 'hashed',
        nickname: '멍냥이',
      },
    });
  });

  it('createOAuth() creates an OAuth-provider user with no email/password', async () => {
    prisma.user.create.mockResolvedValue({ id: 4n });

    await service.createOAuth({
      provider: AuthProvider.kakao,
      providerUid: 'kakao-123',
      nickname: '멍냥이',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        provider: AuthProvider.kakao,
        providerUid: 'kakao-123',
        nickname: '멍냥이',
      },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test users.service -- --verbose`
Expected: FAIL — `Cannot find module './users.service'`

- [ ] **Step 3: Write the implementation**

```typescript
// apps/api/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { AuthProvider, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  findByProviderUid(provider: AuthProvider, providerUid: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { provider, providerUid } });
  }

  createLocal(params: {
    email: string;
    passwordHash: string;
    nickname: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        provider: AuthProvider.local,
        email: params.email,
        passwordHash: params.passwordHash,
        nickname: params.nickname,
      },
    });
  }

  createOAuth(params: {
    provider: AuthProvider;
    providerUid: string;
    nickname: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        provider: params.provider,
        providerUid: params.providerUid,
        nickname: params.nickname,
      },
    });
  }
}
```

```typescript
// apps/api/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test users.service -- --verbose`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/users/
git commit -m "feat: add UsersModule with lookups/creation needed by Auth"
```

---

## Task 5: `TokenService`

**Files:**
- Create: `apps/api/src/auth/token.service.ts`
- Test: `apps/api/src/auth/token.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService.refreshToken.{create,findUnique,update,updateMany}`; `@nestjs/jwt`'s `JwtService.sign`; `@nestjs/config`'s `ConfigService.{get,getOrThrow}` for `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`.
- Produces: `TokenService.issueAccessToken(userId: bigint): string`, `TokenService.issueRefreshToken(userId: bigint): Promise<string>`, `TokenService.rotateRefreshToken(rawToken: string): Promise<{ userId: bigint; refreshToken: string }>` (throws `UnauthorizedException` if invalid/expired/revoked), `TokenService.revokeRefreshToken(rawToken: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/auth/token.service.spec.ts
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  const prisma = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const config = {
    getOrThrow: jest.fn().mockReturnValue('test-access-secret'),
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_EXPIRES_IN') return '1h';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TokenService(
      new JwtService(),
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
  });

  it('issueAccessToken() returns a JWT with sub = userId as a string', () => {
    const token = service.issueAccessToken(42n);
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as {
      sub: string;
    };
    expect(payload.sub).toBe('42');
  });

  it('issueRefreshToken() stores a SHA-256 hash of the returned raw token, never the raw value', async () => {
    prisma.refreshToken.create.mockResolvedValue({});

    const raw = await service.issueRefreshToken(7n);

    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    const createArgs = prisma.refreshToken.create.mock.calls[0][0] as {
      data: { userId: bigint; tokenHash: string; expiresAt: Date };
    };
    expect(createArgs.data.userId).toBe(7n);
    expect(createArgs.data.tokenHash).toBe(createHash('sha256').update(raw).digest('hex'));
    expect(createArgs.data.tokenHash).not.toBe(raw);
  });

  it('rotateRefreshToken() revokes the old token and issues a new one', async () => {
    const raw = 'a-raw-refresh-token';
    const hash = createHash('sha256').update(raw).digest('hex');
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 1n,
      userId: 9n,
      tokenHash: hash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1_000_000),
    });
    prisma.refreshToken.update.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.rotateRefreshToken(raw);

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { revokedAt: expect.any(Date) as Date },
    });
    expect(result.userId).toBe(9n);
    expect(typeof result.refreshToken).toBe('string');
  });

  it('rotateRefreshToken() rejects an unknown token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.rotateRefreshToken('unknown')).rejects.toThrow(UnauthorizedException);
  });

  it('rotateRefreshToken() rejects an already-revoked token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 1n,
      userId: 9n,
      tokenHash: 'x',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1_000_000),
    });

    await expect(service.rotateRefreshToken('revoked-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rotateRefreshToken() rejects an expired token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 1n,
      userId: 9n,
      tokenHash: 'x',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(service.rotateRefreshToken('expired-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('revokeRefreshToken() marks the matching, not-yet-revoked token as revoked', async () => {
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await service.revokeRefreshToken('a-raw-refresh-token');

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash('sha256').update('a-raw-refresh-token').digest('hex'),
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) as Date },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test token.service -- --verbose`
Expected: FAIL — `Cannot find module './token.service'`

- [ ] **Step 3: Write the implementation**

```typescript
// apps/api/src/auth/token.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const DURATION_UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  issueAccessToken(userId: bigint): string {
    return this.jwtService.sign(
      { sub: userId.toString() },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '1h',
      },
    );
  }

  async issueRefreshToken(userId: bigint): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.parseDurationMs(this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d'),
    );

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: this.hashRefreshToken(raw), expiresAt },
    });

    return raw;
  }

  async rotateRefreshToken(rawToken: string): Promise<{ userId: bigint; refreshToken: string }> {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashRefreshToken(rawToken) },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('유효하지 않은 refresh token입니다.');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const refreshToken = await this.issueRefreshToken(existing.userId);
    return { userId: existing.userId, refreshToken };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashRefreshToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashRefreshToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private parseDurationMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }
    return Number(match[1]) * DURATION_UNIT_MS[match[2]];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test token.service -- --verbose`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/token.service.ts apps/api/src/auth/token.service.spec.ts
git commit -m "feat: add TokenService for access/refresh token issuance and rotation"
```

---

## Task 6: `KakaoService`

**Files:**
- Create: `apps/api/src/auth/kakao.service.ts`
- Test: `apps/api/src/auth/kakao.service.spec.ts`

**Interfaces:**
- Consumes: global `fetch` (Node 18+ built-in).
- Produces: `interface KakaoUserInfo { id: string; nickname: string | null }`; `KakaoService.getUserInfo(accessToken: string): Promise<KakaoUserInfo>` (throws `UnauthorizedException` on a non-OK response).

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/auth/kakao.service.spec.ts
import { UnauthorizedException } from '@nestjs/common';
import { KakaoService } from './kakao.service';

describe('KakaoService', () => {
  let service: KakaoService;

  beforeEach(() => {
    service = new KakaoService();
    jest.restoreAllMocks();
  });

  it('getUserInfo() returns id + nickname for a valid token', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: 123456, properties: { nickname: '멍냥이집사' } }),
    } as Response);

    const result = await service.getUserInfo('valid-token');

    expect(global.fetch).toHaveBeenCalledWith('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    expect(result).toEqual({ id: '123456', nickname: '멍냥이집사' });
  });

  it('getUserInfo() returns nickname: null when Kakao omits properties', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 123456 }),
    } as Response);

    const result = await service.getUserInfo('valid-token');

    expect(result).toEqual({ id: '123456', nickname: null });
  });

  it('getUserInfo() throws UnauthorizedException on a non-OK response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(service.getUserInfo('bad-token')).rejects.toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test kakao.service -- --verbose`
Expected: FAIL — `Cannot find module './kakao.service'`

- [ ] **Step 3: Write the implementation**

```typescript
// apps/api/src/auth/kakao.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';

export interface KakaoUserInfo {
  id: string;
  nickname: string | null;
}

interface KakaoUserMeResponse {
  id: number;
  properties?: { nickname?: string };
}

@Injectable()
export class KakaoService {
  async getUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('유효하지 않은 카카오 토큰입니다.');
    }

    const body = (await response.json()) as KakaoUserMeResponse;

    return {
      id: String(body.id),
      nickname: body.properties?.nickname ?? null,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test kakao.service -- --verbose`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/kakao.service.ts apps/api/src/auth/kakao.service.spec.ts
git commit -m "feat: add KakaoService to verify Kakao SDK access tokens"
```

---

## Task 7: `AuthService`

**Files:**
- Create: `apps/api/src/auth/dto/signup-local.dto.ts`
- Create: `apps/api/src/auth/dto/login-local.dto.ts`
- Create: `apps/api/src/auth/dto/kakao-login.dto.ts`
- Create: `apps/api/src/auth/dto/refresh-token.dto.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Test: `apps/api/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `UsersService` (Task 4), `PasswordService` (Task 3), `TokenService` (Task 5), `KakaoService` (Task 6).
- Produces: `interface AuthTokens { accessToken: string; refreshToken: string }`; `AuthService.signup(dto: SignupLocalDto): Promise<AuthTokens>` (throws `ConflictException` on duplicate email); `AuthService.login(dto: LoginLocalDto): Promise<AuthTokens>` (throws `UnauthorizedException` on bad credentials); `AuthService.loginWithKakao(dto: KakaoLoginDto): Promise<AuthTokens>`; `AuthService.refresh(dto: RefreshTokenDto): Promise<AuthTokens>`; `AuthService.logout(dto: RefreshTokenDto): Promise<void>`.

- [ ] **Step 1: Write the DTOs**

```typescript
// apps/api/src/auth/dto/signup-local.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupLocalDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ maxLength: 30 })
  @IsString()
  @MaxLength(30)
  nickname: string;
}
```

```typescript
// apps/api/src/auth/dto/login-local.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginLocalDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}
```

```typescript
// apps/api/src/auth/dto/kakao-login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class KakaoLoginDto {
  @ApiProperty({ description: '카카오 SDK로 발급받은 access token' })
  @IsString()
  accessToken: string;
}
```

```typescript
// apps/api/src/auth/dto/refresh-token.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
```

- [ ] **Step 2: Write the failing test**

```typescript
// apps/api/src/auth/auth.service.spec.ts
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { KakaoService } from './kakao.service';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    findByEmail: jest.fn(),
    findByProviderUid: jest.fn(),
    createLocal: jest.fn(),
    createOAuth: jest.fn(),
  };
  const passwordService = { hash: jest.fn(), compare: jest.fn() };
  const tokenService = {
    issueAccessToken: jest.fn(),
    issueRefreshToken: jest.fn(),
    rotateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  };
  const kakaoService = { getUserInfo: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usersService as unknown as UsersService,
      passwordService as unknown as PasswordService,
      tokenService as unknown as TokenService,
      kakaoService as unknown as KakaoService,
    );
    tokenService.issueAccessToken.mockReturnValue('access-token');
    tokenService.issueRefreshToken.mockResolvedValue('refresh-token');
  });

  describe('signup', () => {
    it('creates a user and returns tokens when the email is not taken', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('hashed-password');
      usersService.createLocal.mockResolvedValue({ id: 1n });

      const result = await service.signup({
        email: 'a@b.com',
        password: 'plaintext-pw',
        nickname: '멍냥이',
      });

      expect(usersService.createLocal).toHaveBeenCalledWith({
        email: 'a@b.com',
        passwordHash: 'hashed-password',
        nickname: '멍냥이',
      });
      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });

    it('throws ConflictException when the email is already taken', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 1n });

      await expect(
        service.signup({ email: 'a@b.com', password: 'x', nickname: 'y' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns tokens for correct credentials', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 1n, passwordHash: 'hashed-password' });
      passwordService.compare.mockResolvedValue(true);

      const result = await service.login({ email: 'a@b.com', password: 'plaintext-pw' });

      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });

    it('throws UnauthorizedException for an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login({ email: 'a@b.com', password: 'x' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for a wrong password', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 1n, passwordHash: 'hashed-password' });
      passwordService.compare.mockResolvedValue(false);

      await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('loginWithKakao', () => {
    it('logs in an existing kakao user without creating a new one', async () => {
      kakaoService.getUserInfo.mockResolvedValue({ id: 'kakao-1', nickname: '멍멍이' });
      usersService.findByProviderUid.mockResolvedValue({ id: 5n });

      const result = await service.loginWithKakao({ accessToken: 'kakao-token' });

      expect(usersService.createOAuth).not.toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });

    it('creates a new user on first kakao login', async () => {
      kakaoService.getUserInfo.mockResolvedValue({ id: 'kakao-1', nickname: '멍멍이' });
      usersService.findByProviderUid.mockResolvedValue(null);
      usersService.createOAuth.mockResolvedValue({ id: 6n });

      await service.loginWithKakao({ accessToken: 'kakao-token' });

      expect(usersService.createOAuth).toHaveBeenCalledWith({
        provider: AuthProvider.kakao,
        providerUid: 'kakao-1',
        nickname: '멍멍이',
      });
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and issues a new access token', async () => {
      tokenService.rotateRefreshToken.mockResolvedValue({
        userId: 1n,
        refreshToken: 'new-refresh-token',
      });

      const result = await service.refresh({ refreshToken: 'old-refresh-token' });

      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'new-refresh-token' });
    });
  });

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      await service.logout({ refreshToken: 'some-refresh-token' });

      expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith('some-refresh-token');
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `yarn test auth.service -- --verbose`
Expected: FAIL — `Cannot find module './auth.service'`

- [ ] **Step 4: Write the implementation**

```typescript
// apps/api/src/auth/auth.service.ts
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { KakaoService } from './kakao.service';
import { SignupLocalDto } from './dto/signup-local.dto';
import { LoginLocalDto } from './dto/login-local.dto';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly kakaoService: KakaoService,
  ) {}

  async signup(dto: SignupLocalDto): Promise<AuthTokens> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.usersService.createLocal({
      email: dto.email,
      passwordHash,
      nickname: dto.nickname,
    });

    return this.issueTokens(user.id);
  }

  async login(dto: LoginLocalDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const passwordMatches = await this.passwordService.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    return this.issueTokens(user.id);
  }

  async loginWithKakao(dto: KakaoLoginDto): Promise<AuthTokens> {
    const kakaoUser = await this.kakaoService.getUserInfo(dto.accessToken);
    let user = await this.usersService.findByProviderUid(AuthProvider.kakao, kakaoUser.id);

    if (!user) {
      user = await this.usersService.createOAuth({
        provider: AuthProvider.kakao,
        providerUid: kakaoUser.id,
        nickname: kakaoUser.nickname ?? `user_${randomBytes(4).toString('hex')}`,
      });
    }

    return this.issueTokens(user.id);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokens> {
    const { userId, refreshToken } = await this.tokenService.rotateRefreshToken(dto.refreshToken);
    return { accessToken: this.tokenService.issueAccessToken(userId), refreshToken };
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    await this.tokenService.revokeRefreshToken(dto.refreshToken);
  }

  private async issueTokens(userId: bigint): Promise<AuthTokens> {
    const accessToken = this.tokenService.issueAccessToken(userId);
    const refreshToken = await this.tokenService.issueRefreshToken(userId);
    return { accessToken, refreshToken };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn test auth.service -- --verbose`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/dto/ apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.service.spec.ts
git commit -m "feat: add AuthService and DTOs for signup/login/kakao/refresh/logout"
```

---

## Task 8: JWT strategy, guard, controller, module wiring — e2e

**Files:**
- Create: `apps/api/src/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/auth/decorators/current-user.decorator.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/test/auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `AuthService` (Task 7), `ConfigService`.
- Produces: `interface RequestUser { userId: bigint }`; `JwtStrategy.validate(payload: { sub: string }): RequestUser`; `JwtAuthGuard` (class, `@UseGuards(JwtAuthGuard)`); `CurrentUser()` param decorator returning `RequestUser`; HTTP routes `POST /auth/signup`, `POST /auth/login`, `POST /auth/kakao`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.

- [ ] **Step 1: JWT strategy**

```typescript
// apps/api/src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
}

export interface RequestUser {
  userId: bigint;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return { userId: BigInt(payload.sub) };
  }
}
```

- [ ] **Step 2: Guard**

```typescript
// apps/api/src/auth/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 3: `@CurrentUser()` decorator**

```typescript
// apps/api/src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
```

- [ ] **Step 4: Controller**

```typescript
// apps/api/src/auth/auth.controller.ts
import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupLocalDto } from './dto/signup-local.dto';
import { LoginLocalDto } from './dto/login-local.dto';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequestUser } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupLocalDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginLocalDto) {
    return this.authService.login(dto);
  }

  @Post('kakao')
  @HttpCode(200)
  loginWithKakao(@Body() dto: KakaoLoginDto) {
    return this.authService.loginWithKakao(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return { userId: user.userId.toString() };
  }
}
```

- [ ] **Step 5: Module**

```typescript
// apps/api/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { KakaoService } from './kakao.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, KakaoService, JwtStrategy],
})
export class AuthModule {}
```

- [ ] **Step 6: Wire into `AppModule`**

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 7: Write the failing e2e test**

This hits the real dev DB and cleans up every user it creates.

```typescript
// apps/api/test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `auth-e2e-${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('rejects signup with an invalid email', () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'password123', nickname: 'tester' })
      .expect(400);
  });

  it('signs up, logs in, refreshes, reads /me, and logs out', async () => {
    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: testEmail, password: 'password123', nickname: 'e2e-tester' })
      .expect(201);

    expect(signupRes.body.accessToken).toEqual(expect.any(String));
    expect(signupRes.body.refreshToken).toEqual(expect.any(String));

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: 'password123' })
      .expect(200);

    const { accessToken, refreshToken } = loginRes.body as {
      accessToken: string;
      refreshToken: string;
    };

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer()).get('/auth/me').expect(401);

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    const newRefreshToken = (refreshRes.body as { refreshToken: string }).refreshToken;

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: newRefreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: newRefreshToken })
      .expect(401);
  });

  it('rejects login with a wrong password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: 'wrong-password' })
      .expect(401);
  });
});
```

- [ ] **Step 8: Run e2e test to verify it passes**

Run: `yarn test:e2e`
Expected: PASS (4 tests). This talks to the real remote dev DB — confirm afterward that no leftover row remains:

```bash
PGPASSWORD='REDACTED_DB_PASSWORD' psql "host=34.133.19.171 port=5432 dbname=mungroad user=ultong sslmode=prefer" -c "SELECT count(*) FROM users WHERE email LIKE 'auth-e2e-%';"
```

Expected: `0`.

- [ ] **Step 9: Full verification pass**

```bash
yarn lint
yarn typecheck
yarn test
yarn test:e2e
```

Expected: all four succeed.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/auth/ apps/api/src/app.module.ts apps/api/test/auth.e2e-spec.ts
git commit -m "feat: wire up Auth module (JWT strategy/guard, controller, e2e)"
```

---

## Self-Review Notes

- **Spec coverage:** every endpoint, the token strategy (access JWT + hashed rotating refresh), the `refresh_tokens` table, the Kakao SDK-token flow, bcrypt password hashing, `.env` vars, and the error-handling table from the spec each map to a task above (Tasks 1–2 infra, 3 password, 4 users, 5 tokens, 6 kakao, 7 auth logic, 8 wiring+e2e).
- **Deferred-scope items** (google/naver/apple OAuth, email verification, rate limiting) are intentionally not tasked — they're out of scope per the spec's "다음 스프린트로 미룬 것" section.
- **Type consistency checked:** `AuthTokens`, `RequestUser`, `KakaoUserInfo`, and every service method signature are used identically across the task that defines them and every task that consumes them.
