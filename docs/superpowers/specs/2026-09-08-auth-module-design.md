# Auth 모듈 설계

**날짜:** 2026-09-08
**대상:** `apps/api` (NestJS)
**상태:** 승인됨 — 구현 계획(writing-plans) 대기

## 배경

`apps/api`는 아직 도메인 모듈이 하나도 없는 상태다(스캐폴딩 + Prisma 연동만 존재). API를 도메인별로 하나씩 만들기로 하고, 의존성 최하단인 **Auth**부터 시작한다. 나머지 도메인(Users/Pets, Search/Matching, Favorites, Reports, Courses, TourAPI 프록시)은 이후 각각 별도 브레인스토밍 사이클을 거친다.

마감(2026-09-21 16:00)까지 여유가 많지 않고 9/9~9/15는 UI 폴리싱 주간으로 이미 예약되어 있어, 이번 스프린트의 Auth는 다음으로 범위를 좁힌다:
- OAuth는 **local + 카카오만** (google/naver/apple은 스키마의 `auth_provider`에 이미 값이 있으므로 나중에 추가만 하면 됨)
- 로컬 회원가입 시 **이메일 인증 생략**
- 카카오 로그인은 **모바일 SDK 토큰 검증 방식** (서버는 카카오 인가 코드 교환을 직접 하지 않음)

## 모듈 구성

```
src/
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    dto/
      signup-local.dto.ts
      login-local.dto.ts
      kakao-login.dto.ts
      refresh-token.dto.ts
    strategies/
      jwt.strategy.ts
    guards/
      jwt-auth.guard.ts
    decorators/
      current-user.decorator.ts
  users/
    users.module.ts
    users.service.ts   -- Auth가 쓰는 최소 기능만: findByEmail, findByProviderUid, create
```

`UsersModule`은 이번엔 Auth 내부 필요분만 구현한다. 프로필 조회/수정, 탈퇴 등 사용자 대상 엔드포인트는 다음 서브프로젝트(Users/Pets)에서 확장한다.

## 엔드포인트

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| POST | `/auth/signup` | - | 로컬 회원가입 (email, password, nickname) → 유저 생성 + 토큰 발급 |
| POST | `/auth/login` | - | 로컬 로그인 (email, password) → access+refresh 발급 |
| POST | `/auth/kakao` | - | 카카오 access token 전달 → 카카오 검증 → 유저 upsert → 토큰 발급 |
| POST | `/auth/refresh` | - (refresh token 필요) | refresh token → 새 access+refresh (로테이션) |
| POST | `/auth/logout` | - (refresh token 필요) | refresh token 폐기 |
| GET | `/auth/me` | JWT | 현재 유저 확인 (스모크 테스트/클라이언트 세션 확인용) |

모든 요청 바디는 `class-validator` DTO 클래스로 검증한다 (`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`가 이미 전역 등록되어 있음).

## 토큰 전략

- **Access token**: JWT, 만료 1시간. Payload `{ sub: userId }`. `JWT_ACCESS_SECRET` 환경변수로 서명.
- **Refresh token**: `crypto.randomBytes(32)` 기반 opaque 문자열. 클라이언트에 원문을 내려주고, **서버 DB에는 SHA-256 해시만 저장**(비밀번호와 동일한 원칙 — DB 유출 시에도 토큰 자체는 못 씀). 만료 30일.
- **로테이션**: `/auth/refresh` 호출 시 기존 refresh row를 `revoked_at`으로 폐기하고 새 refresh를 발급한다. 탈취된 토큰의 재사용을 막는다.
- **로그아웃**: 전달받은 refresh token의 해시로 조회해 `revoked_at`을 채운다.
- **비밀번호**: bcrypt 해시 (`password_hash` 컬럼, 이미 존재).

## DB 스키마 변경

기존 ERD에는 없던 `refresh_tokens` 테이블을 추가한다 (Auth 자체 구현에 필수):

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

`User` 모델에 `refreshTokens RefreshToken[]` 역참조 추가.

새 마이그레이션으로 만들고, 지난번과 동일하게 로컬에서 `prisma migrate dev`로 초안 생성 후 원격 개발 DB(`34.133.19.171/mungroad`)에는 `prisma migrate deploy`로 반영한다.

## 카카오 연동 상세

1. 클라이언트(RN 앱)가 카카오 SDK로 로그인 → 카카오 access token 획득 → `POST /auth/kakao`로 전달
2. 서버가 그 토큰으로 `GET https://kapi.kakao.com/v2/user/me` 호출 (`Authorization: Bearer {token}`)
   - 401 응답 → `UnauthorizedException('유효하지 않은 카카오 토큰')`
   - 200 응답 → 카카오 user id(`id`) 확보
3. `users` 테이블에서 `(provider='kakao', provider_uid=카카오id)`로 조회
   - 있으면 그대로 로그인 처리
   - 없으면 신규 생성 (닉네임은 카카오 프로필의 `properties.nickname` 사용, 없으면 `user_<8자리 랜덤 hex>`)
4. 우리 access+refresh 토큰 발급

외부 호출은 Node 18+ 내장 `fetch`로 구현한다 (`@nestjs/axios`/`axios` 신규 의존성 추가 안 함 — YAGNI).

## 환경변수 (`.env.example`에 추가)

```
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d
```

## 에러 처리

- 이메일 중복 가입 시도 → `ConflictException`
- 잘못된 로그인 자격증명 → `UnauthorizedException` (이메일 존재 여부를 노출하지 않도록 동일 메시지)
- 잘못되었거나 만료/폐기된 refresh token → `UnauthorizedException`
- 잘못된 카카오 토큰 → `UnauthorizedException`

## 테스트 계획

- `AuthService` 유닛 테스트 (Jest, `PrismaService` 목킹): 회원가입 중복 체크, 로그인 성공/실패, refresh 로테이션, 카카오 upsert 분기
- e2e (`test/auth.e2e-spec.ts`): signup → login → me → refresh → logout 전체 흐름, 잘못된 자격증명/토큰 케이스

## 다음 스프린트로 미룬 것 (범위 밖)

- google/naver/apple OAuth 추가
- 이메일 인증, 비밀번호 재설정
- Rate limiting / brute-force 방지 (throttler) — 시간 되면 추가 검토
