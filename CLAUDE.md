# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(claude.ai/code)에게 제공되는 가이드입니다.

# mungnyangroad — 모노레포

Turborepo + Yarn Workspaces 기반 모노레포. RN 앱과 NestJS API를 한 레포에서 관리한다. 각 앱의 상세 규칙은 해당 앱 폴더의 `CLAUDE.md`를 따른다 — 그 폴더 안에서 작업할 때는 이 루트 문서와 함께 반드시 읽을 것.

## 구조

```
apps/
  mobile/     # Expo(React Native) 앱 — apps/mobile/CLAUDE.md 참고
  api/         # NestJS 백엔드 — apps/api/CLAUDE.md 참고
```

새 앱을 추가할 때도 같은 패턴을 따른다: `apps/<name>/`에 두고, 그 앱 전용 `CLAUDE.md`를 만들고, 앱 간 코드를 직접 import하지 않는다. 두 앱이 실제로 공유해야 하는 타입/유틸이 생기면 그때 `packages/`를 만든다(YAGNI — 미리 만들어두지 않는다).

## 명령어 (루트에서 실행, turbo가 각 워크스페이스로 라우팅)

```bash
yarn install          # 전체 워크스페이스 의존성 설치 (루트에서 한 번만)
yarn dev               # 모든 앱 동시 실행 (mobile: expo start, api: nest start --watch)
yarn typecheck           # 모든 워크스페이스 tsc --noEmit
yarn lint                  # 모든 워크스페이스 lint
yarn build                  # 모든 워크스페이스 build (mobile은 build 스크립트 없음 — turbo가 알아서 스킵)
```

특정 앱만 대상으로 하려면 `yarn workspace mobile <script>` / `yarn workspace api <script>` 형태로 실행하거나, 해당 `apps/<name>` 디렉토리로 이동해 직접 실행한다.

## 워크스페이스 원칙

- 의존성은 항상 루트에서 `yarn install`로 설치한다. 개별 앱 폴더에서 `yarn install`을 따로 실행하지 않는다(워크스페이스가 깨질 수 있음).
- `apps/*/package.json`의 `name` 필드가 워크스페이스 식별자다(`mobile`, `api`). 워크스페이스 간 참조가 필요해지면 이 이름으로 `dependencies`에 추가한다.
- 앱마다 독립된 `lint`/`typecheck` 설정을 가진다 — 억지로 통일하지 않는다. `turbo.json`의 태스크 이름(`dev`, `build`, `lint`, `typecheck`)만 앱 간에 맞춘다.
- `.claude/`(Claude Code 설정)는 루트에만 둔다. 앱별 `CLAUDE.md`는 그 앱 안에서만 유효한 규칙을 담는다.

## 배경 (공모전 컨텍스트)

이 프로젝트는 2026 관광데이터 활용 공모전 제출용이다. 반려동물 동반여행 조건 매칭 앱(mobile)과 그 API(api)를 한 팀원이 담당하며, Python 배치/Elasticsearch/PostgreSQL 스키마는 팀원이 별도로 맡는다. 관련 규제 제약(TourAPI 저장 신고, 위치정보사업자 신고 등)은 실제 API 연동 작업 시 재확인이 필요하다.
