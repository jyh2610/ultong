# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(claude.ai/code)에게 제공되는 가이드입니다.

@AGENTS.md

# mungnyangroad — Expo(React Native)

## 명령어

```bash
yarn install          # 의존성 설치
yarn start             # Expo 개발 서버(Metro) 실행
yarn android            # Android에서 실행
yarn ios                 # iOS에서 실행
yarn web                  # 브라우저(react-native-web)에서 실행
yarn typecheck             # tsc --noEmit — 변경할 때마다 실행. 이 저장소의 유일한 자동 검증 수단
yarn lint                   # eslint-config-expo 기반 ESLint(flat config, eslint.config.js)
```

test 도구는 아직 구성되어 있지 않다(jest/테스트 파일 없음). ESLint(`eslint-config-expo` 기반)와 Prettier(`.prettierrc`)는 구성되어 있다. `yarn typecheck`가 이 저장소의 유일한 타입 검증 게이트이므로 작업 완료로 판단하기 전 항상 실행할 것. 기기/시뮬레이터 없이 스모크 테스트하려면 `npx expo export --platform ios`(또는 `--platform web`)로 번들링만 확인한다(`dist/`는 gitignore 대상이라 확인 후 삭제).

## 스택

- Expo(Managed Workflow, SDK 57) + TypeScript
- 네비게이션: React Navigation (`@react-navigation/native-stack`)
- 상태관리: Zustand
- 스타일링: NativeWind(Tailwind CSS for RN, v3) — `className` prop 기반
- 패키지 매니저: yarn

## 아키텍처 원칙

- RN에는 Server/Client Component 구분이 없다 — 전체가 클라이언트 런타임에서 실행된다. 네비게이션 루트는 `App.tsx`가 단독 소유하며(`src/navigation/RootNavigator.tsx`), 화면(screen) 단위 컴포지션이 최상위 단위다.
- 새 화면은 `src/screens/Xxx/`(화면당 폴더)로 추가하고, `src/navigation/RootNavigator.tsx`의 `RootStackParamList`와 `Stack.Screen`에 함께 등록한다. import는 항상 폴더의 `index.ts`를 통해서만 한다(`import HomeScreen from '../screens/Home'`). 파라미터가 필요한 화면은 `undefined` 대신 구체적인 파라미터 타입을 `RootStackParamList`에 명시한다.
- 여러 화면에서 재사용되는 프레젠테이션 컴포넌트만 `src/components/`로 옮긴다. 특정 화면에서만 쓰는 것(하위 컴포넌트, API 호출, 상수, 타입)은 해당 화면 폴더 안에 두고 다른 화면에서 import하지 않는다 — 자세한 구조는 아래 "폴더 구조" 참고.
- 서버/네트워크에서 이미 계산 가능한 값(정렬, 합계, 필터링 등)을 클라이언트에서 다시 계산하지 않는다. 반대로 디바이스에서 즉시 처리 가능한 순수 로직(포맷팅, 파생 상태)을 불필요하게 원격 호출로 미루지 않는다.

### 폴더 구조

```
src/
  screens/        # 화면당 폴더 — 아래 "화면 폴더 구조" 참고
  components/     # 여러 화면에서 재사용되는 프레젠테이션 컴포넌트만
  navigation/      # RootNavigator.tsx (RootStackParamList)
  store/           # Zustand, 도메인별 파일 분리 (exampleStore.ts 등)
  hooks/           # 화면 간 재사용되는 커스텀 훅
  lib/             # 포맷팅/파생 상태 등 순수 함수
  types/           # 특정 화면에 종속되지 않는 공유 타입
  global.css
```

`hooks/`, `lib/`, `types/`는 실제로 두 곳 이상에서 재사용되는 순간에 만든다 — 처음부터 빈 폴더로 만들어두지 않는다. `components/`도 같은 원칙(위 아키텍처 원칙 두 번째 항목)을 따른다.

#### 화면 폴더 구조

`src/screens/` 아래 화면마다 폴더를 만들고, 그 화면 전용 UI/API/상수/타입을 폴더 안에서 관리한다. 내용이 비어 있더라도 `ui/`, `api/`, `constants.ts`, `types.ts`는 항상 만들고, 최상위 `index.ts`로 화면 컴포넌트만 export한다(다른 화면·전역 코드에서는 이 폴더 내부 파일을 직접 import하지 않는다):

```
src/screens/
  Home/
    index.ts          # export { default } from './HomeScreen';
    HomeScreen.tsx     # 화면 컴포넌트 본체
    ui/                 # 화면 전용 하위 컴포넌트
      HomeListItem.tsx
    api/                # 화면 전용 API 호출 함수
      fetchHomeFeed.ts
    constants.ts         # 화면 전용 상수/더미 데이터
    types.ts              # 화면 전용 타입
```

여러 화면에서 재사용이 필요해지면 그때 해당 항목을 상위 공용 디렉토리(`components/`, `lib/`, `types/` 등)로 옮긴다.

### 번들·성능 최소화 규칙

- 무거운 라이브러리(차트, 리치 에디터, PDF 등)는 실제로 그것을 쓰는 화면/컴포넌트 파일에서만 import한다 — 다른 화면으로 의존성이 새어나가지 않게 한다.
- 아이콘은 named import만 사용, 전체 세트 import 금지.
  ```ts
  // ✅ 올바름
  import { Search } from 'lucide-react-native';
  // ❌ 금지
  import * as Icons from 'lucide-react-native';
  ```
- Metro는 웹처럼 라우트 단위 code splitting을 하지 않는다 — 앱 전체가 하나의 JS 번들로 묶이므로, 특히 `Home` 화면이 참조하는 의존성 트리를 가볍게 유지한다.
- 목록은 `.map()` + `ScrollView`로 전체 렌더링하지 않고 `FlatList`(항목 많고 다양하면 `FlashList`)를 사용한다.
- 애니메이션은 JS 스레드를 막는 방식(`setState` 연쇄, 렌더 경로의 동기 heavy computation) 대신 UI 스레드에서 도는 `react-native-reanimated`를 우선 검토한다(이미 NativeWind 의존성으로 설치되어 있음, `babel.config.js`에 `react-native-worklets/plugin` 등록됨).

## 상태관리 (Zustand)

- 도메인별로 `src/store/`에 store 파일을 분리한다 (예: `src/store/exampleStore.ts`). 화면을 넘나드는 전역 상태만 store로 두고, 화면 내부에서만 쓰는 상태는 `useState`로 충분하다.
- 컴포넌트에서는 필요한 값만 선택자로 구독한다 — store 객체 전체를 구조분해하지 않는다.
  ```ts
  // ✅ 올바름 — 필요한 슬라이스만 구독, 불필요한 리렌더 방지
  const count = useCounterStore((state) => state.count);
  // ❌ 지양 — store가 바뀔 때마다 전체를 다시 구독
  const { count, increment } = useCounterStore();
  ```

## 스타일링 (NativeWind)

- 스타일은 `StyleSheet.create` 대신 `className` + Tailwind 유틸리티 클래스를 기본으로 사용한다(`tailwind.config.js`의 `content`에 `App.tsx`, `src/**/*.{js,jsx,ts,tsx}`가 이미 포함됨 — 새 디렉토리를 추가해도 이 패턴 안에 있으면 별도 설정 불필요).
- NativeWind가 지원하지 않는 스타일(일부 플랫폼 전용 prop 등)만 예외적으로 `style` prop이나 `StyleSheet.create`를 병행한다.
- 조건부 클래스는 문자열 템플릿보다 배열/삼항 조합을 짧게 유지하고, 클래스가 길어지면 컴포넌트 분리를 검토한다.
- 전역 스타일 진입점은 `src/global.css` 하나이며 `App.tsx`에서 한 번만 import한다. 화면/컴포넌트에서 별도로 CSS를 import하지 않는다.

## ESLint / Prettier

- ESLint는 `eslint-config-expo`(flat config, `eslint.config.js`) 기반이며 `eslint-config-prettier`로 포맷 관련 규칙과 충돌하지 않도록 구성되어 있다. `yarn lint`로 실행한다.
- Prettier 설정은 `.prettierrc`에 있다(세미콜론 사용, 큰따옴표, trailing comma `all`, `printWidth` 100).
- `babel.config.js`, `metro.config.js`, `tailwind.config.js`는 NativeWind/Reanimated 설정이 서로 맞물려 있으므로 명시적 요청 없이 수정하지 않는다.
