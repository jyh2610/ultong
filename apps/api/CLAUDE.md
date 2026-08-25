# CLAUDE.md

이 파일은 `apps/api`(NestJS 백엔드) 안에서 작업할 때 적용되는 가이드입니다. 모노레포 전체 규칙은 루트 `CLAUDE.md`를 함께 참고하세요.

## 명령어 (이 폴더 기준, 또는 루트에서 `yarn workspace api <script>`)

```bash
yarn dev          # nest start --watch
yarn start          # nest start
yarn build            # nest build
yarn lint               # eslint --fix
yarn typecheck             # tsc --noEmit
yarn test                    # jest 유닛 테스트
yarn test:e2e                  # jest e2e 테스트 (test/*.e2e-spec.ts)
```

## 스택

- NestJS 11 (Express 플랫폼) + TypeScript
- 패키지 매니저: yarn (workspace 루트에서 설치, 이 폴더에서 개별 `yarn install` 실행 금지)

## 현재 상태

Nest CLI 기본 스캐폴딩 + 기반 인프라(아래)만 갖춘 상태다. 인증, 검색/매칭 조회, 사용자·반려동물, 제보, TourAPI 프록시 등 실제 도메인 모듈은 아직 구현되지 않았다 — 이후 작업에서 `src/` 아래 기능별 모듈(Nest의 `@Module` 단위)로 추가한다.

## 기반 인프라

- **환경변수**: `@nestjs/config`의 `ConfigModule.forRoot({ isGlobal: true })`. `.env.example`을 참고해 `.env`를 만든다(`.env`는 gitignore 대상). 새 환경변수를 추가하면 `.env.example`도 같이 갱신한다.
- **검증**: 전역 `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })`가 `main.ts`에 등록되어 있다. 요청 바디를 받는 엔드포인트는 `class-validator` 데코레이터를 쓴 DTO 클래스를 만들어 타입으로 받는다(순수 `interface`/`type`이 아니라 클래스여야 검증이 동작함).
- **보안 헤더**: `helmet()` 미들웨어 적용.
- **CORS**: `CORS_ORIGIN` 환경변수(콤마 구분)로 허용 origin을 지정한다. 비어 있으면 전체 허용(개발 편의) — 프로덕션에 배포할 때는 반드시 값을 채운다.
- **API 문서**: `@nestjs/swagger`로 `/docs`에 Swagger UI가 뜬다. 새 컨트롤러/DTO에는 `@ApiTags`, `@ApiProperty` 등을 붙여 문서에 반영되게 한다.

## 아키텍처 원칙

- 기능(도메인)마다 Nest 모듈로 분리한다(`src/<feature>/<feature>.module.ts`, `.controller.ts`, `.service.ts`). `AppModule`은 각 기능 모듈을 조립하는 역할만 한다.
- DB/외부 API 연동이 생기면 그 지점에서 필요한 라이브러리(예: TypeORM/Prisma, HttpModule)를 도입한다 — 미리 설치해두지 않는다.
- 위치 기반 반경 검색 등 회귀적으로 검토가 필요한 로직은 [[project_contest_proposal]] 메모의 규제 제약(위치정보사업자 신고 여부)을 먼저 확인한다.

## ESLint / Prettier

- `eslint.config.mjs`(typed linting, `@typescript-eslint/recommendedTypeChecked` 포함)와 `.prettierrc`가 Nest CLI 스캐폴딩 기본값이다.
- 모노레포 hoisting 특성상 `tsconfig.json`에 `"types": ["node", "jest"]`를 명시해뒀다 — 이게 없으면 워크스페이스 hoisting 때문에 ESLint의 typed-linting이 jest 전역 타입(`describe`/`it`/`expect`)을 해석하지 못해 `no-unsafe-call` 오류가 난다. 이 항목을 지우지 말 것.
