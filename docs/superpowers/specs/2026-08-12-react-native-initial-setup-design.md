# React Native 프로젝트 초기 세팅 설계

- 날짜: 2026-08-12
- 상태: 승인됨

## 목적

`mungnyangroad` 프로젝트의 React Native 앱 초기 개발 환경을 구성한다. 화면, 네비게이션, 상태관리, 스타일링, 린트/포맷 도구가 기본적으로 동작하는 상태까지 세팅하고, 이후 기능 개발을 바로 시작할 수 있게 한다.

## 결정된 스택

| 항목 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Expo (Managed Workflow) | 커스텀 네이티브 모듈 필요 시 Expo Dev Client / prebuild로 전환 가능 |
| 언어 | TypeScript | |
| 패키지 매니저 | yarn | |
| 네비게이션 | React Navigation (Native Stack) | 예시 화면 2개로 기본 흐름만 구성 |
| 상태관리 | Zustand | 예시 store 1개 포함 |
| 스타일링 | NativeWind (Tailwind CSS for RN) | |
| 코드 품질 | ESLint + Prettier | Expo 기본 ESLint 설정(`eslint-config-expo`) 확장 |
| 앱 이름 / 번들 ID | `mungnyangroad` / `com.mungnyangroad` | |

## 폴더 구조

```
mungnyangroad/
  app.json
  App.tsx
  babel.config.js
  tailwind.config.js
  .eslintrc.js
  .prettierrc
  src/
    screens/
      HomeScreen.tsx
      DetailScreen.tsx
    navigation/
      RootNavigator.tsx
    store/
      exampleStore.ts
    components/
```

- `screens/`: 화면 단위 컴포넌트
- `navigation/`: 네비게이터 정의 (RootNavigator가 Home → Detail 스택 구성)
- `store/`: Zustand 스토어. 초기에는 예시 카운터 스토어 하나만 포함
- `components/`: 화면 간 공유되는 재사용 컴포넌트 (초기에는 빈 폴더)

## 진행 단계

1. `create-expo-app`으로 TypeScript 템플릿 생성 (`mungnyangroad` 앱 이름)
2. `app.json`에 번들 ID(`com.mungnyangroad`) 설정 (ios.bundleIdentifier, android.package)
3. React Navigation (`@react-navigation/native`, `@react-navigation/native-stack`) 및 필수 피어 의존성(`react-native-screens`, `react-native-safe-area-context`) 설치, `RootNavigator` 작성 후 `App.tsx`에 연결
4. NativeWind 설치, `babel.config.js` / `tailwind.config.js` 설정, 글로벌 타입 선언 추가
5. Zustand 설치, `src/store/exampleStore.ts`에 간단한 카운터 스토어 작성
6. ESLint + Prettier 설정 파일 추가 (`.eslintrc.js`, `.prettierrc`), `package.json`에 `lint` 스크립트 추가
7. `HomeScreen`(카운터 + Detail 이동 버튼), `DetailScreen`(뒤로가기) 작성하여 네비게이션·상태관리·스타일링이 실제로 동작하는지 확인
8. `yarn start`로 Expo 개발 서버 구동 확인 (사용자가 시뮬레이터/기기에서 직접 확인)

## 테스트 계획

이번 초기 세팅 범위에서는 별도 자동화 테스트를 추가하지 않는다. 대신 다음을 수동으로 확인한다:
- `yarn start` 실행 시 번들링 오류 없이 Expo 개발 서버가 뜨는지
- Home 화면에서 카운터 버튼(Zustand 상태 변경)과 NativeWind 스타일이 적용되는지
- Home → Detail 화면 이동 및 뒤로가기가 정상 동작하는지
- `yarn lint` 실행 시 에러 없이 통과하는지

## 범위 제외

- 백엔드/API 연동
- 인증, 딥링크, 푸시 알림 등 부가 기능
- 자동화된 단위/E2E 테스트 구성
- CI/CD 파이프라인
