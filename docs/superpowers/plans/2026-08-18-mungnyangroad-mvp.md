# 멍냥로드 (MeongNyangRoad) MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `design_handoff_mobile_app/`의 디자인 핸드오프(README.md + 멍냥로드.dc.html 프로토타입)를 이 Expo/RN 코드베이스의 패턴으로 재구현해, 반려동물 프로필 기반으로 시설별 입장 가능 여부를 매칭해 보여주는 7개 화면짜리 앱을 만든다.

**Architecture:** 목업 시설 데이터(추후 관광공사 API로 교체)를 순수 함수 매칭 엔진(`computeMatch`)으로 반려동물 조건과 대조해 3단계 상태(입장가능/조건부가능/확인필요)를 계산한다. Zustand로 pet/course/offline 전역 상태를 관리하고, TanStack Query로 데이터 페칭을 감싸 목업→실 API 전환 시 화면 코드는 그대로 두고 `src/lib/facilities.ts` 내부만 교체하면 되게 한다. 네비게이션은 하단 탭(홈/코스/보관함/마이페이지) 위에 스택(온보딩/검색결과/상세)을 얹은 구조로 바꾼다.

**Tech Stack:** Expo SDK 57(Managed) + TypeScript, React Navigation(native-stack + bottom-tabs), Zustand, NativeWind v3, TanStack Query + `fetch` 기반 `apiClient`(이미 세팅됨).

## Global Constraints

- 이 저장소에는 테스트 러너가 없다(jest 미설치). **`yarn typecheck`가 유일한 자동 검증 수단**이므로, 아래 각 태스크의 "검증" 스텝은 TDD의 "실패하는 테스트 실행" 대신 `yarn typecheck` 통과 여부로 게이트한다. **토큰 사용량을 줄이기 위해 `npx expo export` 등 번들 스모크 테스트는 태스크별 검증에서 실행하지 않는다 — 각 태스크의 검증은 `yarn typecheck` 통과만으로 완료한다** (출력이 큰 명령은 최종 리뷰 단계에서도 실행하지 않는다).
- **UI 널뛰기 금지 (레이아웃 시프트 방지).** 데이터 페칭 중이거나 데이터가 아직 없을 때 `data ?? []` 식으로 빈 배열/빈 상태를 렌더링해 화면이 순간적으로 비었다가 데이터 도착 시 카드가 튀어나오듯 나타나는 것을 금지한다. TanStack Query의 `isPending`을 항상 확인해 로딩 중에는 최종 콘텐츠와 동일한 크기(dimensions)의 스켈레톤 UI를 렌더링하고, 데이터 도착 후 스켈레톤이 실제 카드로 "치환"되되 카드 바깥 컨테이너 크기가 바뀌지 않게 한다. **"로딩 중(isPending)"과 "실제로 데이터가 없음(empty)"은 반드시 구분**한다 — 로딩 중에 empty state를 먼저 보여줬다가 데이터가 오면 리스트로 바뀌는 것도 동일한 널뛰기이므로 금지. Task 6에서 만드는 `Skeleton`류 컴포넌트는 실제 카드/행 컴포넌트(Task 6의 `FacilityListCard` 등)와 **정확히 같은 outer 치수**를 가져야 한다.
- 화면은 `src/screens/Xxx/`(화면당 폴더) + `index.ts` 배럴 export. 폴더 안엔 항상 `ui/`, `api/`, `constants.ts`, `types.ts`를 둔다(비어 있어도). 다른 화면에서 이 폴더 내부 파일을 직접 import하지 않는다.
- 여러 화면에서 재사용되는 것만 `src/components/`, `src/lib/`, `src/types/`로 옮긴다 — 처음부터 만들지 않되, 아래 태스크들은 처음부터 5개 화면 이상이 공유하는 것이 확정된 항목(매칭 로직, 시설 데이터, 상태 배지 등)이므로 곧바로 공용 위치에 만든다.
- 스타일은 `className` + NativeWind. `StyleSheet.create`는 NativeWind가 지원하지 않는 경우만.
- 아이콘은 named import만, 전체 세트 import 금지. 프로토타입 아이콘은 전부 인라인 SVG이므로 `react-native-svg`로 각각 컴포넌트화한다(외부 아이콘 라이브러리 불필요).
- 목록은 `FlatList` 사용(검색결과/코스/보관함/추천 캐러셀). `.map()` + `ScrollView` 금지.
- Primary 색상은 브랜드팀 미확정 — 기본값 `#7A4A2B`로 진행하고 `tailwind.config.js`의 `primary` 토큰 한 곳만 바꾸면 전체에 반영되게 한다.
- `src/store/exampleStore.ts`(카운터 데모)는 Task 8(홈 화면)에서 실제 홈 화면으로 교체하며 삭제한다.
- `src/screens/Detail/`는 현재 스켈레톤 placeholder다 — Task 10에서 시설 상세 화면 내용으로 교체한다(폴더/라우트 이름은 유지).

---

## File Structure

```
src/
  types/
    pet.ts                 # Species, Pet, PetSize
    facility.ts             # FacilityCategory, Confidence, MatchStatus, Facility, MatchReason, MatchResult
  lib/
    petSize.ts               # sizeOf()
    matching.ts               # computeMatch(), checklistFor(), mergeChecklists()
    statusColor.ts             # MatchStatus -> NativeWind 클래스 매핑
    facilities.ts               # 목업 데이터 + fetchFacilities()/fetchFacilityById() (추후 실 API로 교체되는 지점)
    apiClient.ts                 # (기존) fetch 래퍼
    queryClient.ts                # (기존) QueryClient
  store/
    petStore.ts               # pets[] CRUD
    courseStore.ts             # savedIds[], checkedPrep{}
    offlineStore.ts             # offlineSaved boolean
    toastStore.ts               # 전역 토스트 메시지
  components/
    StatusBadge.tsx
    ToggleSwitch.tsx
    ChecklistItem.tsx
    FacilityListCard.tsx        # 검색결과 리스트 행
    FacilityCarouselCard.tsx     # 홈 추천 캐러셀 카드
    SavedFacilityRow.tsx          # 코스/보관함 행(순서번호)
    EmptyState.tsx
    Toast.tsx
    icons/
      BackIcon.tsx
      SearchIcon.tsx
      LocationPinIcon.tsx
      CheckIcon.tsx
      CloseIcon.tsx
      TabHomeIcon.tsx
      TabCourseIcon.tsx
      TabOfflineIcon.tsx
      TabMypageIcon.tsx
  navigation/
    RootNavigator.tsx           # RootStackParamList: Onboarding, MainTabs, Search, Detail
    MainTabNavigator.tsx          # MainTabParamList: Home, Course, Offline, MyPage
    types.ts                       # RootStackScreenProps<T>, MainTabScreenProps<T>
  screens/
    Onboarding/
    Home/
    Search/
    Detail/                     # 기존 placeholder -> 시설 상세로 교체
    Course/
    Offline/
    MyPage/
```

---

### Task 1: 디자인 토큰 + Pretendard 폰트 세팅

**Files:**
- Modify: `tailwind.config.js`
- Modify: `app.json`
- Create: `assets/fonts/Pretendard-Regular.otf`, `assets/fonts/Pretendard-SemiBold.otf`, `assets/fonts/Pretendard-Bold.otf`
- Modify: `App.tsx`

**Interfaces:**
- Produces: Tailwind 색상 토큰 `primary`, `frame`, `screen`, `ink`, `ink-soft`, `ink-faint`, `card`, `card-border`, `card-border-alt`, `status-ok-bg`, `status-ok-fg`, `status-conditional-bg`, `status-conditional-fg`, `status-check-bg`, `status-check-fg`, `alert-bg`, `alert-border`, `alert-text`, `quote-bg`, `quote-border`, `quote-text`. 이후 모든 태스크가 이 이름을 그대로 className에서 사용한다(예: `bg-primary`, `text-ink-soft`).
- Produces: `fontFamily.sans = ["Pretendard"]` — 이후 모든 태스크는 별도 `style={{fontFamily}}` 없이 기본 폰트로 Pretendard를 받는다.

- [ ] **Step 1: Pretendard 폰트 파일 내려받기**

https://github.com/orioncactus/pretendard 의 `Pretendard-Regular.otf`, `Pretendard-SemiBold.otf`, `Pretendard-Bold.otf`를 `assets/fonts/`에 저장한다(디렉토리 없으면 생성).

- [ ] **Step 2: `tailwind.config.js`에 디자인 토큰 추가**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard"],
      },
      colors: {
        primary: "#7A4A2B",
        frame: "#EDE9E1",
        screen: "#FAF7F6",
        ink: "#1C1C1E",
        "ink-soft": "#6B6B6E",
        "ink-faint": "#9A9A9E",
        card: "#FFFFFF",
        "card-border": "#EEE9E0",
        "card-border-alt": "#E8E4DC",
        "status-ok-bg": "#E3F3E9",
        "status-ok-fg": "#1F7A45",
        "status-conditional-bg": "#FDF1DD",
        "status-conditional-fg": "#B4720A",
        "status-check-bg": "#F0EFEC",
        "status-check-fg": "#6B6B6E",
        "alert-bg": "#FDF1DD",
        "alert-border": "#F0D9A8",
        "alert-text": "#8A5A0A",
        "quote-bg": "#FAF8F4",
        "quote-border": "#DDD6C8",
        "quote-text": "#5C5138",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: `app.json`에 `expo-font` config plugin 등록**

`expo` 객체에 `plugins` 배열을 추가(없었으므로 새로 추가):

```json
{
  "expo": {
    "name": "mungnyangroad",
    "slug": "mungnyangroad",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "plugins": [
      [
        "expo-font",
        {
          "fonts": [
            "./assets/fonts/Pretendard-Regular.otf",
            "./assets/fonts/Pretendard-SemiBold.otf",
            "./assets/fonts/Pretendard-Bold.otf"
          ]
        }
      ]
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.mungnyangroad"
    },
    "android": {
      "package": "com.mungnyangroad",
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

- [ ] **Step 4: `expo-font` 패키지 설치**

Run: `npx expo install expo-font`

- [ ] **Step 5: 검증**

Run: `yarn typecheck` — 통과해야 함.

(config plugin은 네이티브 프로젝트 재생성이 필요한 값이라 `expo prebuild` 전까지는 시뮬레이터에서 즉시 반영되지 않을 수 있음 — Managed workflow에서는 EAS Build/`expo run:ios` 시점에 적용됨을 팀에 공유.)

- [ ] **Step 6: 커밋**

```bash
git add tailwind.config.js app.json assets/fonts package.json yarn.lock
git commit -m "feat: add design tokens and Pretendard font config"
```

---

### Task 2: 매칭 도메인 로직 구현 (lib/)

**Files:**
- Create: `src/types/pet.ts`
- Create: `src/types/facility.ts`
- Create: `src/lib/petSize.ts`
- Create: `src/lib/matching.ts`
- Create: `src/lib/statusColor.ts`

**Interfaces:**
- Produces: `sizeOf(weightKg: number): PetSize`
- Produces: `computeMatch(pet: Pet, facility: Facility): MatchResult`
- Produces: `checklistFor(facility: Facility): string[]`
- Produces: `mergeChecklists(facilities: Facility[]): string[]`
- Produces: `statusColor(status: MatchStatus): { bg: string; fg: string }` (Tailwind 클래스명 문자열 페어)
- 이후 모든 태스크(스토어, 화면)가 이 함수들과 타입을 그대로 import해서 쓴다.

- [ ] **Step 1: 타입 정의**

```ts
// src/types/pet.ts
export type Species = "강아지" | "고양이";
export type PetSize = "소형" | "중형" | "대형";

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  weight: number;
  hasCage: boolean;
}
```

```ts
// src/types/facility.ts
import type { PetSize } from "./pet";

export type FacilityCategory =
  | "관광지"
  | "문화시설"
  | "축제/행사"
  | "레포츠"
  | "숙박"
  | "쇼핑"
  | "음식"
  | "교통";

export type Confidence = "확실" | "추정";
export type MatchStatus = "입장가능" | "조건부가능" | "확인필요";

export interface Facility {
  id: string;
  name: string;
  category: FacilityCategory;
  type: string;
  region: string;
  address: string;
  hours: string;
  updated: string;
  allowedSizes: PetSize[];
  weightLimitKg: number | null;
  cageRequired: boolean;
  leashRequired: boolean;
  indoorAllowed: boolean;
  outdoorAllowed: boolean;
  confidence: Confidence;
  reportCount: number;
  rawText: string;
}

export interface MatchReason {
  label: string;
  ok: boolean;
  confidence: Confidence;
}

export interface MatchResult {
  status: MatchStatus;
  reasons: MatchReason[];
}
```

- [ ] **Step 2: `sizeOf` 구현**

```ts
// src/lib/petSize.ts
import type { PetSize } from "../types/pet";

export function sizeOf(weightKg: number): PetSize {
  if (weightKg <= 5) return "소형";
  if (weightKg <= 15) return "중형";
  return "대형";
}
```

- [ ] **Step 3: 매칭 엔진 구현 (프로토타입 `computeMatch` 로직 그대로 이식)**

```ts
// src/lib/matching.ts
import type { Pet } from "../types/pet";
import type { Facility, MatchReason, MatchResult } from "../types/facility";
import { sizeOf } from "./petSize";

export function computeMatch(pet: Pet, facility: Facility): MatchResult {
  const size = sizeOf(pet.weight);
  const reasons: MatchReason[] = [];
  let hardFail = false;

  const sizeOk = facility.allowedSizes.includes(size);
  reasons.push({ label: `견종 크기: ${size}견 기준`, ok: sizeOk, confidence: facility.confidence });
  if (!sizeOk) hardFail = true;

  if (facility.weightLimitKg != null) {
    const weightOk = pet.weight <= facility.weightLimitKg;
    reasons.push({
      label: `체중 제한 ${facility.weightLimitKg}kg 이하`,
      ok: weightOk,
      confidence: facility.confidence,
    });
    if (!weightOk) hardFail = true;
  } else {
    reasons.push({ label: "체중 제한 없음", ok: true, confidence: "확실" });
  }

  if (facility.cageRequired) {
    const cageOk = pet.hasCage;
    reasons.push({ label: "이동장(케이지) 필수", ok: cageOk, confidence: facility.confidence });
    if (!cageOk) hardFail = true;
  }

  if (facility.leashRequired) {
    reasons.push({ label: "목줄 착용 필수", ok: true, confidence: facility.confidence });
  }

  reasons.push({
    label: facility.indoorAllowed ? "실내 동반 가능" : "실내 동반 불가",
    ok: true,
    confidence: facility.confidence,
  });
  reasons.push({
    label: facility.outdoorAllowed ? "실외 동반 가능" : "실외 동반 불가",
    ok: true,
    confidence: facility.confidence,
  });

  const softIssue = facility.confidence === "추정";
  const status = hardFail ? "확인필요" : softIssue ? "조건부가능" : "입장가능";

  return { status, reasons };
}

export function checklistFor(facility: Facility): string[] {
  const items = ["배변봉투", "접종증명서"];
  if (facility.leashRequired) items.push("목줄");
  if (facility.cageRequired) items.push("이동장(케이지)");
  return items;
}

export function mergeChecklists(facilities: Facility[]): string[] {
  return Array.from(new Set(facilities.flatMap(checklistFor)));
}
```

- [ ] **Step 4: 상태별 색상 매핑 (Task 1의 토큰 이름 사용)**

```ts
// src/lib/statusColor.ts
import type { MatchStatus } from "../types/facility";

const STATUS_CLASSES: Record<MatchStatus, { bg: string; fg: string }> = {
  입장가능: { bg: "bg-status-ok-bg", fg: "text-status-ok-fg" },
  조건부가능: { bg: "bg-status-conditional-bg", fg: "text-status-conditional-fg" },
  확인필요: { bg: "bg-status-check-bg", fg: "text-status-check-fg" },
};

export function statusColor(status: MatchStatus): { bg: string; fg: string } {
  return STATUS_CLASSES[status];
}
```

- [ ] **Step 5: 검증**

Run: `yarn typecheck` — 통과해야 함.

- [ ] **Step 6: 커밋**

```bash
git add src/types/pet.ts src/types/facility.ts src/lib/petSize.ts src/lib/matching.ts src/lib/statusColor.ts
git commit -m "feat: add pet/facility types and matching engine"
```

---

### Task 3: Zustand 스토어 구성 (pet/course/offline/toast)

**Files:**
- Create: `src/store/petStore.ts`
- Create: `src/store/courseStore.ts`
- Create: `src/store/offlineStore.ts`
- Create: `src/store/toastStore.ts`

**Interfaces:**
- Consumes: `Pet`, `Species` (`src/types/pet.ts`, Task 2)
- Produces: `usePetStore` — `pets: Pet[]`, `addPet(): void`, `updatePet(id: string, patch: Partial<Pet>): void`, `removePet(id: string): void`
- Produces: `useCourseStore` — `savedIds: string[]`, `checkedPrep: Record<string, boolean>`, `toggleSaved(id: string): boolean`(담겼으면 true), `togglePrep(name: string): void`
- Produces: `useOfflineStore` — `offlineSaved: boolean`, `setOfflineSaved(v: boolean): void`
- Produces: `useToastStore` — `message: string`, `show(message: string): void`, `clear(): void`
- 이후 온보딩/마이페이지(petStore), 상세/코스/보관함(courseStore), 오프라인(offlineStore), 전역 토스트 오버레이(toastStore)가 각각 소비한다.

- [ ] **Step 1: petStore**

```ts
// src/store/petStore.ts
import { create } from "zustand";
import type { Pet } from "../types/pet";

type PetState = {
  pets: Pet[];
  addPet: () => void;
  updatePet: (id: string, patch: Partial<Pet>) => void;
  removePet: (id: string) => void;
};

export const usePetStore = create<PetState>((set) => ({
  pets: [{ id: "1", name: "뽀삐", species: "강아지", breed: "몰티즈", weight: 3, hasCage: true }],
  addPet: () =>
    set((state) => ({
      pets: [
        ...state.pets,
        {
          id: String(Date.now()),
          name: `반려동물 ${state.pets.length + 1}`,
          species: "강아지",
          breed: "",
          weight: 5,
          hasCage: false,
        },
      ],
    })),
  updatePet: (id, patch) =>
    set((state) => ({
      pets: state.pets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  removePet: (id) => set((state) => ({ pets: state.pets.filter((p) => p.id !== id) })),
}));
```

- [ ] **Step 2: courseStore**

```ts
// src/store/courseStore.ts
import { create } from "zustand";

type CourseState = {
  savedIds: string[];
  checkedPrep: Record<string, boolean>;
  toggleSaved: (id: string) => boolean;
  togglePrep: (name: string) => void;
};

export const useCourseStore = create<CourseState>((set, get) => ({
  savedIds: [],
  checkedPrep: {},
  toggleSaved: (id) => {
    const has = get().savedIds.includes(id);
    set((state) => ({
      savedIds: has ? state.savedIds.filter((x) => x !== id) : [...state.savedIds, id],
    }));
    return !has;
  },
  togglePrep: (name) =>
    set((state) => ({ checkedPrep: { ...state.checkedPrep, [name]: !state.checkedPrep[name] } })),
}));
```

- [ ] **Step 3: offlineStore**

```ts
// src/store/offlineStore.ts
import { create } from "zustand";

type OfflineState = {
  offlineSaved: boolean;
  setOfflineSaved: (v: boolean) => void;
};

export const useOfflineStore = create<OfflineState>((set) => ({
  offlineSaved: false,
  setOfflineSaved: (v) => set({ offlineSaved: v }),
}));
```

- [ ] **Step 4: toastStore**

```ts
// src/store/toastStore.ts
import { create } from "zustand";

type ToastState = {
  message: string;
  show: (message: string) => void;
  clear: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  message: "",
  show: (message) => set({ message }),
  clear: () => set({ message: "" }),
}));
```

- [ ] **Step 5: 검증**

Run: `yarn typecheck` — 통과해야 함.

- [ ] **Step 6: 커밋**

```bash
git add src/store/petStore.ts src/store/courseStore.ts src/store/offlineStore.ts src/store/toastStore.ts
git commit -m "feat: add pet/course/offline/toast zustand stores"
```

---

### Task 4: 시설 목업 데이터 + API 연동 지점 준비

**Files:**
- Create: `src/lib/facilities.ts`

**Interfaces:**
- Consumes: `Facility` (`src/types/facility.ts`, Task 2)
- Produces: `fetchFacilities(): Promise<Facility[]>`, `fetchFacilityById(id: string): Promise<Facility | undefined>`
- Task 15(실 API 연동)에서 이 파일 내부 구현만 `apiFetch<Facility[]>("/facilities")` 호출로 교체하면 되고, 화면 쪽 호출부(각 화면의 `api/`)는 바뀌지 않는다.

- [ ] **Step 1: 프로토타입의 8개 목업 시설을 타입에 맞춰 이식**

```ts
// src/lib/facilities.ts
import type { Facility } from "../types/facility";

const MOCK_FACILITIES: Facility[] = [
  { id: "a", name: "시설A", category: "음식", type: "감성 카페", region: "서울", address: "서울 마포구 어딘가로 12", hours: "매일 10:00 - 21:00", updated: "2026.06.02", allowedSizes: ["소형"], weightLimitKg: 5, cageRequired: false, leashRequired: true, indoorAllowed: true, outdoorAllowed: true, confidence: "확실", reportCount: 0, rawText: "소형견(5kg 이하)만 실내 동반 가능, 목줄 착용 필수" },
  { id: "b", name: "시설B", category: "숙박", type: "독채 펜션", region: "강릉", address: "강원 강릉시 어딘가길 45", hours: "체크인 15:00 · 체크아웃 11:00", updated: "2026.05.20", allowedSizes: ["소형", "중형", "대형"], weightLimitKg: null, cageRequired: false, leashRequired: true, indoorAllowed: true, outdoorAllowed: true, confidence: "확실", reportCount: 1, rawText: "견종 제한 없음, 실내외 동반 가능하나 리드줄 착용 필수" },
  { id: "c", name: "시설C", category: "관광지", type: "수목원", region: "제주", address: "제주 서귀포시 어딘가로 8", hours: "매일 09:00 - 18:00", updated: "2026.04.11", allowedSizes: ["소형", "중형"], weightLimitKg: 10, cageRequired: true, leashRequired: true, indoorAllowed: false, outdoorAllowed: true, confidence: "추정", reportCount: 4, rawText: "중형견 이하 동반 가능, 이동장 지참 권장 (실내 전시관 제외)" },
  { id: "d", name: "시설D", category: "쇼핑", type: "편집숍", region: "서울", address: "서울 성동구 어딘가길 3", hours: "매일 11:00 - 20:00", updated: "2026.06.15", allowedSizes: ["소형", "중형", "대형"], weightLimitKg: null, cageRequired: true, leashRequired: false, indoorAllowed: true, outdoorAllowed: false, confidence: "확실", reportCount: 0, rawText: "이동장(케이지) 착용 시에만 매장 내 동반 가능" },
  { id: "e", name: "시설E", category: "음식", type: "해변 카페", region: "부산", address: "부산 해운대구 어딘가로 21", hours: "매일 10:00 - 22:00", updated: "2026.03.30", allowedSizes: ["소형", "중형", "대형"], weightLimitKg: null, cageRequired: false, leashRequired: true, indoorAllowed: false, outdoorAllowed: true, confidence: "확실", reportCount: 0, rawText: "야외석(테라스)에 한해 반려동물 동반 가능, 목줄 필수" },
  { id: "f", name: "시설F", category: "레포츠", type: "대형견 놀이터", region: "경기", address: "경기 양평군 어딘가로 100", hours: "매일 09:00 - 19:00", updated: "2026.02.18", allowedSizes: ["대형"], weightLimitKg: null, cageRequired: false, leashRequired: false, indoorAllowed: false, outdoorAllowed: true, confidence: "추정", reportCount: 3, rawText: "목줄 해제 자유 활동 가능 구역, 대형견 위주 이용" },
  { id: "g", name: "시설G", category: "문화시설", type: "반려동반 갤러리", region: "서울", address: "서울 종로구 어딘가길 9", hours: "매일 10:00 - 18:00", updated: "2026.05.02", allowedSizes: ["소형", "중형"], weightLimitKg: 12, cageRequired: true, leashRequired: true, indoorAllowed: true, outdoorAllowed: false, confidence: "확실", reportCount: 0, rawText: "12kg 이하, 이동장 또는 유모차 이용 시 실내 관람 가능" },
  { id: "h", name: "시설H", category: "축제/행사", type: "반려동반 마켓", region: "경기", address: "경기 고양시 어딘가로 55", hours: "주말 11:00 - 17:00", updated: "2026.04.28", allowedSizes: ["소형", "중형", "대형"], weightLimitKg: null, cageRequired: false, leashRequired: true, indoorAllowed: false, outdoorAllowed: true, confidence: "추정", reportCount: 0, rawText: "행사장 전체 야외 진행, 목줄 착용 시 견종 제한 없이 입장" },
];

// TODO(Task 15): 관광공사 반려동반 여행정보 API 연동 시 아래 두 함수 내부만
// apiFetch<Facility[]>("/facilities") / apiFetch<Facility>(`/facilities/${id}`) 로 교체한다.
export async function fetchFacilities(): Promise<Facility[]> {
  return MOCK_FACILITIES;
}

export async function fetchFacilityById(id: string): Promise<Facility | undefined> {
  return MOCK_FACILITIES.find((f) => f.id === id);
}
```

- [ ] **Step 2: 검증**

Run: `yarn typecheck` — 통과해야 함.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/facilities.ts
git commit -m "feat: add mock facility data source"
```

---

### Task 5: 네비게이션 구조 개편 (탭 + 스택)

**Files:**
- Modify: `src/navigation/RootNavigator.tsx`
- Create: `src/navigation/MainTabNavigator.tsx`
- Create: `src/navigation/types.ts`
- Modify: `App.tsx`

**Interfaces:**
- Produces: `RootStackParamList` — `Onboarding: undefined; MainTabs: undefined; Search: { category?: string }; Detail: { facilityId: string }`
- Produces: `MainTabParamList` — `Home: undefined; Course: undefined; Offline: undefined; MyPage: undefined`
- Produces: `RootStackScreenProps<T>`, `MainTabScreenProps<T>` — Task 7~13의 각 화면 `types.ts`가 이 두 제네릭을 사용해 자기 props 타입을 만든다.

- [ ] **Step 1: `@react-navigation/bottom-tabs` 설치**

Run: `npx expo install @react-navigation/bottom-tabs`

- [ ] **Step 2: RootStackParamList 갱신**

```tsx
// src/navigation/RootNavigator.tsx
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DetailScreen from "../screens/Detail";
import OnboardingScreen from "../screens/Onboarding";
import SearchScreen from "../screens/Search";
import { MainTabNavigator } from "./MainTabNavigator";

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  Search: { category?: string };
  Detail: { facilityId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Onboarding" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

(모든 화면이 프로토타입에서 자체 헤더/뒤로가기 버튼을 그리므로 `headerShown: false`로 통일 — 네이티브 헤더 대신 각 화면이 커스텀 헤더를 렌더링한다.)

- [ ] **Step 3: MainTabNavigator 작성**

```tsx
// src/navigation/MainTabNavigator.tsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { TabCourseIcon } from "../components/icons/TabCourseIcon";
import { TabHomeIcon } from "../components/icons/TabHomeIcon";
import { TabMypageIcon } from "../components/icons/TabMypageIcon";
import { TabOfflineIcon } from "../components/icons/TabOfflineIcon";
import CourseScreen from "../screens/Course";
import HomeScreen from "../screens/Home";
import MyPageScreen from "../screens/MyPage";
import OfflineScreen from "../screens/Offline";

export type MainTabParamList = {
  Home: undefined;
  Course: undefined;
  Offline: undefined;
  MyPage: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#7A4A2B",
        tabBarInactiveTintColor: "#9A9A9E",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "홈", tabBarIcon: ({ color }) => <TabHomeIcon color={color} /> }}
      />
      <Tab.Screen
        name="Course"
        component={CourseScreen}
        options={{ tabBarLabel: "코스", tabBarIcon: ({ color }) => <TabCourseIcon color={color} /> }}
      />
      <Tab.Screen
        name="Offline"
        component={OfflineScreen}
        options={{ tabBarLabel: "보관함", tabBarIcon: ({ color }) => <TabOfflineIcon color={color} /> }}
      />
      <Tab.Screen
        name="MyPage"
        component={MyPageScreen}
        options={{ tabBarLabel: "마이페이지", tabBarIcon: ({ color }) => <TabMypageIcon color={color} /> }}
      />
    </Tab.Navigator>
  );
}
```

(`tabBarActiveTintColor`는 Task 1의 `primary` 토큰과 같은 값 `#7A4A2B`로 하드코딩 — NativeWind className이 적용되지 않는 네비게이션 옵션이라 값이 어긋나지 않도록 주석으로 출처를 남긴다.)

- [ ] **Step 4: 컴포지트 스크린 프롭 타입**

```ts
// src/navigation/types.ts
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { MainTabParamList } from "./MainTabNavigator";
import type { RootStackParamList } from "./RootNavigator";

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
```

- [ ] **Step 5: 검증**

Run: `yarn typecheck` — Onboarding/Search/Detail/Home/Course/Offline/MyPage 화면 모듈이 아직 없으므로 이 시점엔 import 에러가 남는다. Task 7~13에서 각 화면이 만들어지며 해소되는 것이 정상 — 이 태스크에서는 `RootNavigator.tsx`, `MainTabNavigator.tsx`, `types.ts` 세 파일 자체의 문법/타입 에러가 없는지 `npx tsc --noEmit` 출력에서 이 세 파일 관련 에러가 없는지로 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add src/navigation/RootNavigator.tsx src/navigation/MainTabNavigator.tsx src/navigation/types.ts package.json yarn.lock
git commit -m "feat: restructure navigation into tab + stack"
```

---

### Task 6: 공용 프레젠테이션 컴포넌트 구현

**Files:**
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/ToggleSwitch.tsx`
- Create: `src/components/ChecklistItem.tsx`
- Create: `src/components/FacilityListCard.tsx`
- Create: `src/components/FacilityCarouselCard.tsx`
- Create: `src/components/SavedFacilityRow.tsx`
- Create: `src/components/EmptyState.tsx`
- Create: `src/components/Toast.tsx`
- Create: `src/components/Skeleton.tsx`
- Create: `src/components/FacilityListCardSkeleton.tsx`
- Create: `src/components/FacilityCarouselCardSkeleton.tsx`
- Create: `src/components/SavedFacilityRowSkeleton.tsx`

**Interfaces:**
- Consumes: `MatchStatus`, `Facility` (Task 2), `statusColor` (Task 2), `useToastStore` (Task 3)
- Produces: 아래 각 컴포넌트의 props 시그니처 — Task 7~13이 그대로 사용한다.
- Produces: `FacilityListCardSkeleton`, `FacilityCarouselCardSkeleton`, `SavedFacilityRowSkeleton` — Task 8/9/11/12가 `isPending` 동안 각각 `FacilityCarouselCard`/`FacilityListCard`/`SavedFacilityRow`와 **정확히 같은 outer 치수**로 렌더링한다(레이아웃 시프트 방지, Global Constraints 참고).

- [ ] **Step 1: StatusBadge**

```tsx
// src/components/StatusBadge.tsx
import { Text, View } from "react-native";

import { statusColor } from "../lib/statusColor";
import type { MatchStatus } from "../types/facility";

type StatusBadgeProps = {
  status: MatchStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, fg } = statusColor(status);
  return (
    <View className={`rounded-md px-2 py-0.5 ${bg}`}>
      <Text className={`text-[10px] font-bold ${fg}`}>{status}</Text>
    </View>
  );
}
```

- [ ] **Step 2: ToggleSwitch**

```tsx
// src/components/ToggleSwitch.tsx
import { Pressable, View } from "react-native";

type ToggleSwitchProps = {
  value: boolean;
  onToggle: () => void;
};

export function ToggleSwitch({ value, onToggle }: ToggleSwitchProps) {
  return (
    <Pressable
      onPress={onToggle}
      className={`h-[26px] w-[46px] justify-center rounded-full ${value ? "bg-primary" : "bg-[#DADAD4]"}`}
    >
      <View
        className="h-5 w-5 rounded-full bg-white"
        style={{ marginLeft: value ? 23 : 3 }}
      />
    </Pressable>
  );
}
```

- [ ] **Step 3: ChecklistItem**

```tsx
// src/components/ChecklistItem.tsx
import { Pressable, Text, View } from "react-native";

import { CheckIcon } from "./icons/CheckIcon";

type ChecklistItemProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
};

export function ChecklistItem({ label, checked, onToggle }: ChecklistItemProps) {
  return (
    <Pressable onPress={onToggle} className="flex-row items-center gap-2.5 px-2.5 py-2.5">
      <View
        className={`h-[19px] w-[19px] items-center justify-center rounded-md border-[1.5px] ${
          checked ? "border-primary bg-primary" : "border-[#DADAD4] bg-white"
        }`}
      >
        {checked && <CheckIcon color="#fff" />}
      </View>
      <Text className={`text-[13.5px] ${checked ? "text-ink-faint line-through" : "text-ink"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 4: FacilityListCard (검색결과용)**

```tsx
// src/components/FacilityListCard.tsx
import { Pressable, Text, View } from "react-native";

import { StatusBadge } from "./StatusBadge";
import type { Facility, MatchResult } from "../types/facility";

type FacilityListCardProps = {
  facility: Facility;
  match: MatchResult;
  onPress: () => void;
};

export function FacilityListCard({ facility, match, onPress }: FacilityListCardProps) {
  const alertFlag = facility.reportCount >= 3;
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row gap-3 rounded-2xl border border-card-border bg-card p-3"
    >
      <View className="h-[68px] w-[68px] rounded-xl bg-[#EEE9E0]" />
      <View className="flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="text-[14.5px] font-bold text-ink">{facility.name}</Text>
          <StatusBadge status={match.status} />
        </View>
        <Text className="my-1 text-xs text-ink-soft">
          {facility.type} · {facility.region}
        </Text>
        <Text className="text-[10.5px] text-ink-faint">최종 갱신 {facility.updated}</Text>
        {alertFlag && (
          <Text className="mt-1 text-[10.5px] font-semibold text-alert-text">
            ⚠ 최근 규정 변경 가능성 (제보 누적)
          </Text>
        )}
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 5: FacilityCarouselCard (홈 추천용)**

```tsx
// src/components/FacilityCarouselCard.tsx
import { Pressable, Text, View } from "react-native";

import { StatusBadge } from "./StatusBadge";
import type { Facility, MatchResult } from "../types/facility";

type FacilityCarouselCardProps = {
  facility: Facility;
  match: MatchResult;
  onPress: () => void;
};

export function FacilityCarouselCard({ facility, match, onPress }: FacilityCarouselCardProps) {
  const alertFlag = facility.reportCount >= 3;
  return (
    <Pressable onPress={onPress} className="w-[172px]">
      <View className="mb-2 h-[112px] w-[172px] rounded-2xl bg-[#EEE9E0]" />
      <StatusBadge status={match.status} />
      <Text className="mt-1.5 text-sm font-bold text-ink">
        {facility.name} · {facility.type}
      </Text>
      <Text className="text-[11.5px] text-ink-soft">{facility.region}</Text>
      {alertFlag && (
        <Text className="mt-1 text-[10.5px] font-semibold text-alert-text">⚠ 규정 변경 가능성</Text>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 6: SavedFacilityRow (코스/보관함용)**

```tsx
// src/components/SavedFacilityRow.tsx
import { Pressable, Text, View } from "react-native";

import { StatusBadge } from "./StatusBadge";
import type { Facility, MatchResult } from "../types/facility";

type SavedFacilityRowProps = {
  facility: Facility;
  match: MatchResult;
  order: number;
  onPress?: () => void;
  onRemove?: () => void;
};

export function SavedFacilityRow({ facility, match, order, onPress, onRemove }: SavedFacilityRowProps) {
  return (
    <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-card-border bg-card p-3.5">
      <View className="h-[26px] w-[26px] items-center justify-center rounded-lg bg-[#EEF5F0]">
        <Text className="text-xs font-bold text-primary">{order}</Text>
      </View>
      <Pressable onPress={onPress} disabled={!onPress} className="flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-sm font-bold text-ink">{facility.name}</Text>
          <StatusBadge status={match.status} />
        </View>
        <Text className="mt-0.5 text-[11.5px] text-ink-soft">
          {facility.type} · {facility.region}
        </Text>
      </Pressable>
      {onRemove && (
        <Pressable onPress={onRemove}>
          <Text className="text-xs text-alert-text">제거</Text>
        </Pressable>
      )}
    </View>
  );
}
```

- [ ] **Step 7: EmptyState**

```tsx
// src/components/EmptyState.tsx
import { Text, View } from "react-native";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View className="items-center px-5 py-16">
      <Text className="mb-1.5 text-[13.5px] text-ink-faint">{title}</Text>
      <Text className="text-center text-xs leading-5 text-ink-faint">{description}</Text>
    </View>
  );
}
```

- [ ] **Step 8: Toast (전역 오버레이)**

```tsx
// src/components/Toast.tsx
import { useEffect } from "react";
import { Text } from "react-native";

import { useToastStore } from "../store/toastStore";

export function Toast() {
  const message = useToastStore((state) => state.message);
  const clear = useToastStore((state) => state.clear);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clear, 1800);
    return () => clearTimeout(timer);
  }, [message, clear]);

  if (!message) return null;

  return (
    <Text className="absolute bottom-5 left-5 right-5 z-30 rounded-xl bg-ink px-4 py-3 text-center text-[12.5px] text-white">
      {message}
    </Text>
  );
}
```

- [ ] **Step 9: Skeleton (기본 shimmer 블록)**

```tsx
// src/components/Skeleton.tsx
import { useEffect } from "react";
import type { DimensionValue } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type SkeletonProps = {
  width: DimensionValue;
  height: DimensionValue;
  radius?: number;
};

export function Skeleton({ width, height, radius = 8 }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className="bg-[#E8E4DC]"
      style={[{ width, height, borderRadius: radius }, animatedStyle]}
    />
  );
}
```

- [ ] **Step 10: 카드/행 스켈레톤 — Step 4~6에서 만든 실제 카드와 outer 치수를 정확히 맞춘다**

```tsx
// src/components/FacilityListCardSkeleton.tsx
import { View } from "react-native";

import { Skeleton } from "./Skeleton";

export function FacilityListCardSkeleton() {
  return (
    <View className="mb-3 flex-row gap-3 rounded-2xl border border-card-border bg-card p-3">
      <Skeleton width={68} height={68} radius={12} />
      <View className="flex-1 justify-center gap-2">
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
        <Skeleton width="30%" height={10} />
      </View>
    </View>
  );
}
```

```tsx
// src/components/FacilityCarouselCardSkeleton.tsx
import { View } from "react-native";

import { Skeleton } from "./Skeleton";

export function FacilityCarouselCardSkeleton() {
  return (
    <View className="w-[172px]">
      <Skeleton width={172} height={112} radius={14} />
      <View className="mt-2 gap-1.5">
        <Skeleton width={60} height={16} radius={7} />
        <Skeleton width="80%" height={14} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}
```

```tsx
// src/components/SavedFacilityRowSkeleton.tsx
import { View } from "react-native";

import { Skeleton } from "./Skeleton";

export function SavedFacilityRowSkeleton() {
  return (
    <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-card-border bg-card p-3.5">
      <Skeleton width={26} height={26} radius={8} />
      <View className="flex-1 gap-2">
        <Skeleton width="50%" height={14} />
        <Skeleton width="35%" height={12} />
      </View>
    </View>
  );
}
```

- [ ] **Step 11: 검증**

Run: `yarn typecheck` — `src/components/icons/CheckIcon`는 Task 14에서 만들어지므로 이 시점엔 해당 import 에러가 남는 것이 정상. 나머지 11개 파일은 에러 없어야 함.

- [ ] **Step 12: 커밋**

```bash
git add src/components/StatusBadge.tsx src/components/ToggleSwitch.tsx src/components/ChecklistItem.tsx src/components/FacilityListCard.tsx src/components/FacilityCarouselCard.tsx src/components/SavedFacilityRow.tsx src/components/EmptyState.tsx src/components/Toast.tsx src/components/Skeleton.tsx src/components/FacilityListCardSkeleton.tsx src/components/FacilityCarouselCardSkeleton.tsx src/components/SavedFacilityRowSkeleton.tsx
git commit -m "feat: add shared presentational and skeleton components"
```

---

### Task 7: 온보딩 화면 구현

**Files:**
- Create: `src/screens/Onboarding/index.ts`
- Create: `src/screens/Onboarding/OnboardingScreen.tsx`
- Create: `src/screens/Onboarding/ui/PetProfileCard.tsx`
- Create: `src/screens/Onboarding/types.ts`
- Create: `src/screens/Onboarding/constants.ts` (빈 상수 파일 — 화면 전용 상수 생기면 채움)
- Create: `src/screens/Onboarding/api/` (빈 디렉토리 — 화면 전용 API 없음, `.gitkeep`)

**Interfaces:**
- Consumes: `usePetStore` (Task 3), `sizeOf` (Task 2), `RootStackScreenProps<"Onboarding">` (Task 5)
- Produces: `OnboardingScreen` default export via `index.ts`

- [ ] **Step 1: 화면 타입**

```ts
// src/screens/Onboarding/types.ts
import type { RootStackScreenProps } from "../../navigation/types";

export type OnboardingScreenProps = RootStackScreenProps<"Onboarding">;
```

- [ ] **Step 2: PetProfileCard (온보딩/마이페이지 공용 — 두 화면에서 쓰므로 애초에 각 화면 폴더가 아니라 공용으로 둘지 고민했으나, 두 화면의 카드 사이즈/여백이 살짝 다르므로 우선 Onboarding 소유로 만들고 MyPage(Task 13)에서 동일 컴포넌트를 import해 재사용한다 — 이 시점부터 재사용이 확정이므로 실제로는 `src/components/PetProfileCard.tsx`가 맞다.)**

```tsx
// src/components/PetProfileCard.tsx
import { Pressable, Text, TextInput, View } from "react-native";
import Slider from "@react-native-community/slider";

import { ToggleSwitch } from "./ToggleSwitch";
import { sizeOf } from "../lib/petSize";
import type { Pet } from "../types/pet";

type PetProfileCardProps = {
  pet: Pet;
  onChange: (patch: Partial<Pet>) => void;
  onRemove: () => void;
};

export function PetProfileCard({ pet, onChange, onRemove }: PetProfileCardProps) {
  const size = sizeOf(pet.weight);

  return (
    <View className="mb-3.5 rounded-2xl border border-card-border bg-card p-4">
      <View className="mb-3.5 flex-row items-center justify-between gap-2">
        <TextInput
          value={pet.name}
          onChangeText={(name) => onChange({ name })}
          className="flex-1 text-base font-bold text-ink"
        />
        <Pressable onPress={onRemove}>
          <Text className="text-xs text-alert-text">삭제</Text>
        </Pressable>
      </View>
      <View className="mb-3.5 flex-row gap-2.5">
        <Pressable
          onPress={() => onChange({ species: pet.species === "강아지" ? "고양이" : "강아지" })}
          className="flex-1 rounded-xl border border-card-border-alt bg-quote-bg p-2.5"
        >
          <Text className="text-center text-[13.5px] font-semibold text-ink">{pet.species}</Text>
        </Pressable>
        <TextInput
          value={pet.breed}
          onChangeText={(breed) => onChange({ breed })}
          placeholder="견종/묘종"
          className="flex-1 rounded-xl border border-card-border-alt p-2.5 text-[13.5px] text-ink"
        />
      </View>
      <View className="mb-3">
        <View className="mb-1.5 flex-row justify-between">
          <Text className="text-xs text-ink-soft">체중</Text>
          <Text className="text-xs font-bold text-ink">
            {pet.weight}kg · {size}견
          </Text>
        </View>
        <Slider
          minimumValue={1}
          maximumValue={40}
          step={1}
          value={pet.weight}
          onValueChange={(weight) => onChange({ weight })}
          minimumTrackTintColor="#7A4A2B"
        />
      </View>
      <View className="flex-row items-center justify-between border-t border-[#F1EEE7] pt-2.5">
        <Text className="text-[13.5px] text-ink">이동장(케이지) 소지</Text>
        <ToggleSwitch value={pet.hasCage} onToggle={() => onChange({ hasCage: !pet.hasCage })} />
      </View>
    </View>
  );
}
```

- [ ] **Step 3: `@react-native-community/slider` 설치**

Run: `npx expo install @react-native-community/slider`

- [ ] **Step 4: OnboardingScreen**

```tsx
// src/screens/Onboarding/OnboardingScreen.tsx
import { Pressable, ScrollView, Text, View } from "react-native";

import { PetProfileCard } from "../../components/PetProfileCard";
import { usePetStore } from "../../store/petStore";
import type { OnboardingScreenProps } from "./types";

export function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const pets = usePetStore((state) => state.pets);
  const addPet = usePetStore((state) => state.addPet);
  const updatePet = usePetStore((state) => state.updatePet);
  const removePet = usePetStore((state) => state.removePet);

  return (
    <View className="flex-1 bg-screen">
      <ScrollView contentContainerClassName="px-5 pb-24 pt-4">
        <View className="mb-5.5">
          <Text className="mb-2 text-xs font-bold tracking-wide text-primary">멍냥로드</Text>
          <Text className="text-[25px] font-bold leading-9 text-ink">
            반려동물 프로필을{"\n"}등록해주세요
          </Text>
          <Text className="mt-2 text-[13.5px] leading-5 text-ink-soft">
            체중과 크기를 기준으로 시설별 입장 가능 여부를 자동으로 확인해드려요
          </Text>
        </View>
        {pets.map((pet) => (
          <PetProfileCard
            key={pet.id}
            pet={pet}
            onChange={(patch) => updatePet(pet.id, patch)}
            onRemove={() => removePet(pet.id)}
          />
        ))}
        <Pressable
          onPress={addPet}
          className="w-full rounded-2xl border-[1.5px] border-dashed border-[#C9CABF] p-3.5"
        >
          <Text className="text-center text-[13.5px] font-semibold text-ink-soft">
            + 반려동물 추가
          </Text>
        </Pressable>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-3.5">
        <Pressable
          onPress={() => navigation.replace("MainTabs")}
          className="w-full rounded-2xl bg-primary p-4"
        >
          <Text className="text-center text-[15.5px] font-bold text-white">시작하기</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: index.ts**

```ts
// src/screens/Onboarding/index.ts
export { OnboardingScreen as default } from "./OnboardingScreen";
```

- [ ] **Step 6: 검증**

Run: `yarn typecheck`

- [ ] **Step 7: 커밋**

```bash
git add src/screens/Onboarding src/components/PetProfileCard.tsx package.json yarn.lock
git commit -m "feat: implement onboarding screen"
```

---

### Task 8: 홈 화면 구현

**Files:**
- Modify: `src/screens/Home/HomeScreen.tsx` (기존 카운터 데모 → 홈 화면으로 교체)
- Modify: `src/screens/Home/types.ts`
- Create: `src/screens/Home/api/useHomeFacilities.ts`
- Create: `src/screens/Home/constants.ts` (CATEGORIES, REGIONS)
- Delete: `src/store/exampleStore.ts` (더 이상 참조하는 곳 없음)

**Interfaces:**
- Consumes: `usePetStore`(Task 3), `fetchFacilities`(Task 4), `computeMatch`(Task 2), `FacilityCarouselCard`/`FacilityCarouselCardSkeleton`(Task 6), `MainTabScreenProps<"Home">`(Task 5)
- 로딩 처리는 Global Constraints의 "UI 널뛰기 금지"를 따른다: `useHomeFacilities()`의 `isPending`이 true인 동안은 추천 캐러셀에 `FacilityCarouselCardSkeleton` 3개를 렌더링하고, `data ?? []`로 빈 배열을 렌더링하지 않는다.

- [ ] **Step 1: 화면 타입**

```ts
// src/screens/Home/types.ts
import type { MainTabScreenProps } from "../../navigation/types";

export type HomeScreenProps = MainTabScreenProps<"Home">;
```

- [ ] **Step 2: 상수 (카테고리/지역)**

```ts
// src/screens/Home/constants.ts
export const HOME_CATEGORIES = [
  { key: "walk", label: "🐾 산책 친화" },
  { key: "관광지", label: "관광지" },
  { key: "문화시설", label: "문화시설" },
  { key: "축제/행사", label: "축제/행사" },
  { key: "레포츠", label: "레포츠" },
  { key: "숙박", label: "숙박" },
  { key: "쇼핑", label: "쇼핑" },
  { key: "음식", label: "음식" },
  { key: "교통", label: "교통" },
] as const;

export const POPULAR_REGIONS = ["서울", "제주", "부산", "강릉"] as const;
```

- [ ] **Step 3: 화면 전용 쿼리 훅**

```ts
// src/screens/Home/api/useHomeFacilities.ts
import { useQuery } from "@tanstack/react-query";

import { fetchFacilities } from "../../../lib/facilities";

export function useHomeFacilities() {
  return useQuery({ queryKey: ["facilities"], queryFn: fetchFacilities });
}
```

- [ ] **Step 4: HomeScreen**

```tsx
// src/screens/Home/HomeScreen.tsx
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { FacilityCarouselCard } from "../../components/FacilityCarouselCard";
import { FacilityCarouselCardSkeleton } from "../../components/FacilityCarouselCardSkeleton";
import { computeMatch } from "../../lib/matching";
import { sizeOf } from "../../lib/petSize";
import { usePetStore } from "../../store/petStore";
import { useHomeFacilities } from "./api/useHomeFacilities";
import { HOME_CATEGORIES, POPULAR_REGIONS } from "./constants";
import type { HomeScreenProps } from "./types";

const SKELETON_KEYS = ["skeleton-0", "skeleton-1", "skeleton-2"];

export function HomeScreen({ navigation }: HomeScreenProps) {
  const pets = usePetStore((state) => state.pets);
  const pet = pets[0];
  const { data: facilities, isPending } = useHomeFacilities();

  const recommendations =
    pet && facilities
      ? facilities
          .map((facility) => ({ facility, match: computeMatch(pet, facility) }))
          .slice(0, 3)
      : [];

  return (
    <View className="flex-1 bg-screen">
      <ScrollView contentContainerClassName="px-5 pb-8 pt-4">
        <View className="mb-4.5 flex-row items-start justify-between">
          <View>
            <Text className="mb-1 text-xs text-ink-soft">반가워요</Text>
            <Text className="text-[21px] font-bold leading-7 text-ink">
              {pet?.name ?? "반려동물"}와 함께{"\n"}어디로 떠나볼까요?
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("MyPage")}
            className="h-[42px] w-[42px] items-center justify-center rounded-full bg-[#EEF5F0]"
          >
            <Text className="text-[17px] font-bold text-primary">{pet?.name.charAt(0) ?? "멍"}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => navigation.getParent()?.navigate("Search", {})}
          className="mb-2.5 w-full flex-row items-center gap-2.5 rounded-2xl border border-card-border-alt bg-card p-4"
        >
          <TextInput
            editable={false}
            placeholder="지역, 시설명으로 검색"
            className="flex-1 text-[14.5px] text-ink-faint"
            pointerEvents="none"
          />
        </Pressable>
        <Pressable
          onPress={() => navigation.getParent()?.navigate("Search", {})}
          className="mb-4 w-full flex-row items-center gap-2 rounded-2xl border border-card-border-alt bg-[#EEF5F0] px-4 py-3"
        >
          <Text className="text-[13.5px] font-semibold text-primary">
            내 주변 반려동반 가능 시설 보기
          </Text>
        </Pressable>
        <FlatList
          horizontal
          data={HOME_CATEGORIES}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 mb-6.5"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.getParent()?.navigate("Search", { category: item.key })}
              className="rounded-xl border border-card-border-alt bg-card px-3.5 py-2.5"
            >
              <Text className="text-xs font-semibold text-ink">{item.label}</Text>
            </Pressable>
          )}
        />
        <Text className="mb-1 text-[15.5px] font-bold text-ink">우리 아이 조건에 맞는 추천</Text>
        {pet && (
          <Text className="mb-3.5 text-xs text-ink-soft">
            {pet.name}({sizeOf(pet.weight)}견 · {pet.weight}kg) 기준
          </Text>
        )}
        {isPending ? (
          <FlatList
            horizontal
            data={SKELETON_KEYS}
            keyExtractor={(key) => key}
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 mb-6.5"
            renderItem={() => <FacilityCarouselCardSkeleton />}
          />
        ) : (
          <FlatList
            horizontal
            data={recommendations}
            keyExtractor={(item) => item.facility.id}
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 mb-6.5"
            renderItem={({ item }) => (
              <FacilityCarouselCard
                facility={item.facility}
                match={item.match}
                onPress={() =>
                  navigation.getParent()?.navigate("Detail", { facilityId: item.facility.id })
                }
              />
            )}
          />
        )}
        <Text className="mb-3 mt-6.5 text-[15.5px] font-bold text-ink">인기 지역</Text>
        <View className="flex-row flex-wrap gap-2">
          {POPULAR_REGIONS.map((region) => (
            <Pressable
              key={region}
              onPress={() => navigation.getParent()?.navigate("Search", {})}
              className="w-[23%] rounded-xl border border-card-border-alt bg-card py-3.5"
            >
              <Text className="text-center text-xs font-semibold text-ink">{region}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
```

(`navigation.getParent()?.navigate(...)`는 `MainTabScreenProps`의 컴포지트 타입 덕분에 부모 스택(`RootStackParamList`)의 `Search`/`Detail` 라우트로 타입 안전하게 이동한다 — Task 5에서 만든 `CompositeScreenProps` 구조 때문.)

- [ ] **Step 5: index.ts는 기존 파일 그대로 유지, exampleStore 삭제**

Run: `rm src/store/exampleStore.ts`

(다른 어떤 파일도 더 이상 `exampleStore`를 참조하지 않는지 확인: `grep -r "exampleStore" src/` 결과가 없어야 함.)

- [ ] **Step 6: 검증**

Run: `yarn typecheck`
Run: `grep -r "exampleStore" src/` — 결과 없어야 함.

- [ ] **Step 7: 커밋**

```bash
git add src/screens/Home src/store/exampleStore.ts
git commit -m "feat: implement home screen"
```

---

### Task 9: 검색결과 화면 구현

**Files:**
- Create: `src/screens/Search/index.ts`
- Create: `src/screens/Search/SearchScreen.tsx`
- Create: `src/screens/Search/types.ts`
- Create: `src/screens/Search/constants.ts`
- Create: `src/screens/Search/api/useFacilities.ts`

**Interfaces:**
- Consumes: `fetchFacilities`(Task 4), `computeMatch`(Task 2), `FacilityListCard`/`FacilityListCardSkeleton`/`Skeleton`(Task 6), `RootStackScreenProps<"Search">`(Task 5)
- "산책 친화" 필터는 단순 카테고리 매치가 아니라 `outdoorAllowed && (관광지 | 레포츠)` 커스텀 필터 (README "Interactions & Behavior" 참고).
- 로딩 처리(Global Constraints "UI 널뛰기 금지"): `useFacilities()`의 `isPending`이 true인 동안 결과 리스트는 `FacilityListCardSkeleton` 4개, 헤더의 "· N곳"과 상태 요약 카운트는 숫자 대신 `Skeleton` 바로 표시한다 — `0곳`/`입장가능 0`처럼 실제 값이 아닌 숫자를 잠깐 보여줬다가 바뀌는 것도 금지 대상.

- [ ] **Step 1: 화면 타입**

```ts
// src/screens/Search/types.ts
import type { RootStackScreenProps } from "../../navigation/types";

export type SearchScreenProps = RootStackScreenProps<"Search">;
```

- [ ] **Step 2: 상수**

```ts
// src/screens/Search/constants.ts
export const SEARCH_CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "walk", label: "🐾 산책 친화" },
  { key: "관광지", label: "관광지" },
  { key: "문화시설", label: "문화시설" },
  { key: "축제/행사", label: "축제/행사" },
  { key: "레포츠", label: "레포츠" },
  { key: "숙박", label: "숙박" },
  { key: "쇼핑", label: "쇼핑" },
  { key: "음식", label: "음식" },
  { key: "교통", label: "교통" },
] as const;
```

- [ ] **Step 3: 쿼리 훅**

```ts
// src/screens/Search/api/useFacilities.ts
import { useQuery } from "@tanstack/react-query";

import { fetchFacilities } from "../../../lib/facilities";

export function useFacilities() {
  return useQuery({ queryKey: ["facilities"], queryFn: fetchFacilities });
}
```

- [ ] **Step 4: SearchScreen**

```tsx
// src/screens/Search/SearchScreen.tsx
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { BackIcon } from "../../components/icons/BackIcon";
import { FacilityListCard } from "../../components/FacilityListCard";
import { FacilityListCardSkeleton } from "../../components/FacilityListCardSkeleton";
import { Skeleton } from "../../components/Skeleton";
import { computeMatch } from "../../lib/matching";
import { usePetStore } from "../../store/petStore";
import { useFacilities } from "./api/useFacilities";
import { SEARCH_CATEGORIES } from "./constants";
import type { SearchScreenProps } from "./types";

const SKELETON_KEYS = ["skeleton-0", "skeleton-1", "skeleton-2", "skeleton-3"];

export function SearchScreen({ navigation, route }: SearchScreenProps) {
  const [category, setCategory] = useState(route.params?.category ?? "all");
  const pet = usePetStore((state) => state.pets[0]);
  const { data: facilities, isPending } = useFacilities();

  const withMatch =
    pet && facilities ? facilities.map((f) => ({ facility: f, match: computeMatch(pet, f) })) : [];

  const filtered = withMatch.filter(({ facility }) => {
    if (category === "all") return true;
    if (category === "walk") {
      return facility.outdoorAllowed && ["관광지", "레포츠"].includes(facility.category);
    }
    return facility.category === category;
  });

  const okCount = withMatch.filter((f) => f.match.status === "입장가능").length;
  const condCount = withMatch.filter((f) => f.match.status === "조건부가능").length;
  const checkCount = withMatch.filter((f) => f.match.status === "확인필요").length;

  return (
    <View className="flex-1 bg-screen px-5 pt-3.5">
      <View className="mb-4 flex-row items-center gap-2.5">
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-[34px] w-[34px] items-center justify-center rounded-full border border-card-border-alt bg-card"
        >
          <BackIcon color="#1C1C1E" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-ink">
          검색결과{" "}
          {isPending ? (
            <Skeleton width={40} height={14} radius={4} />
          ) : (
            <Text className="text-[13.5px] font-normal text-ink-soft">· {filtered.length}곳</Text>
          )}
        </Text>
      </View>
      <FlatList
        horizontal
        data={SEARCH_CATEGORIES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 mb-3.5"
        renderItem={({ item }) => {
          const active = item.key === category;
          return (
            <Pressable
              onPress={() => setCategory(item.key)}
              className={`rounded-xl border px-3.5 py-2 ${
                active ? "border-primary bg-primary" : "border-card-border-alt bg-card"
              }`}
            >
              <Text className={`text-xs font-bold ${active ? "text-white" : "text-ink"}`}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
      <View className="mb-4 flex-row flex-wrap gap-3">
        {isPending ? (
          <>
            <Skeleton width={70} height={11} radius={4} />
            <Skeleton width={80} height={11} radius={4} />
            <Skeleton width={70} height={11} radius={4} />
          </>
        ) : (
          <>
            <Text className="text-[11px] text-ink-soft">입장가능 {okCount}</Text>
            <Text className="text-[11px] text-ink-soft">조건부가능 {condCount}</Text>
            <Text className="text-[11px] text-ink-soft">확인필요 {checkCount}</Text>
          </>
        )}
      </View>
      {isPending ? (
        <FlatList
          data={SKELETON_KEYS}
          keyExtractor={(key) => key}
          contentContainerClassName="pb-8"
          renderItem={() => <FacilityListCardSkeleton />}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.facility.id}
          contentContainerClassName="pb-8"
          renderItem={({ item }) => (
            <FacilityListCard
              facility={item.facility}
              match={item.match}
              onPress={() => navigation.navigate("Detail", { facilityId: item.facility.id })}
            />
          )}
        />
      )}
    </View>
  );
}
```

(README의 "지도 미리보기" placeholder와 리스트/지도 토글은 이번 MVP 범위에서는 리스트 뷰만 구현하고, 지도 토글 버튼은 실제 지도 연동이 확정되면 별도 태스크로 추가한다 — 지도 SDK 선택이 아직 없는 상태에서 만드는 건 placeholder를 위한 placeholder라 스코프에서 제외.)

- [ ] **Step 5: index.ts**

```ts
// src/screens/Search/index.ts
export { SearchScreen as default } from "./SearchScreen";
```

- [ ] **Step 6: 검증**

Run: `yarn typecheck`

- [ ] **Step 7: 커밋**

```bash
git add src/screens/Search
git commit -m "feat: implement search results screen"
```

---

### Task 10: 시설 상세 화면 구현

**Files:**
- Modify: `src/screens/Detail/DetailScreen.tsx` (기존 placeholder 교체)
- Modify: `src/screens/Detail/types.ts`
- Modify: `src/screens/Detail/constants.ts`
- Create: `src/screens/Detail/api/useFacility.ts`
- Create: `src/screens/Detail/ui/DetailScreenSkeleton.tsx`

**Interfaces:**
- Consumes: `fetchFacilityById`(Task 4), `computeMatch`/`checklistFor`(Task 2), `useCourseStore`/`useToastStore`(Task 3), `ChecklistItem`/`Skeleton`(Task 6), `RootStackScreenProps<"Detail">`(Task 5)
- 로딩 처리(Global Constraints "UI 널뛰기 금지"): `useFacility(facilityId)`의 `isPending`이 true인 동안 `return null`로 화면을 비우지 않고, 실제 레이아웃과 같은 구조의 `DetailScreenSkeleton`(이 태스크의 `ui/`에서 생성)을 렌더링한다.

- [ ] **Step 1: 화면 타입**

```ts
// src/screens/Detail/types.ts
import type { RootStackScreenProps } from "../../navigation/types";

export type DetailScreenProps = RootStackScreenProps<"Detail">;
```

- [ ] **Step 2: 쿼리 훅**

```ts
// src/screens/Detail/api/useFacility.ts
import { useQuery } from "@tanstack/react-query";

import { fetchFacilityById } from "../../../lib/facilities";

export function useFacility(id: string) {
  return useQuery({ queryKey: ["facility", id], queryFn: () => fetchFacilityById(id) });
}
```

- [ ] **Step 3: DetailScreenSkeleton (화면 전용 — 이 화면의 특정 레이아웃과만 결합돼 있으므로 `ui/`에 둔다)**

```tsx
// src/screens/Detail/ui/DetailScreenSkeleton.tsx
import { View } from "react-native";

import { Skeleton } from "../../../components/Skeleton";

export function DetailScreenSkeleton() {
  return (
    <View className="flex-1 bg-screen">
      <Skeleton width="100%" height={210} radius={0} />
      <View className="px-5 pt-4.5">
        <View className="mb-3 gap-1.5">
          <Skeleton width={120} height={11} />
          <Skeleton width={180} height={20} />
          <Skeleton width={100} height={12} />
        </View>
        <View className="mb-5.5 gap-2 rounded-2xl border border-card-border bg-card p-3.5">
          <Skeleton width="80%" height={12} />
          <Skeleton width="60%" height={12} />
          <Skeleton width="50%" height={11} />
        </View>
        <Skeleton width={120} height={15} radius={4} />
        <View className="mb-2 mt-2.5 rounded-2xl border border-card-border bg-card">
          {["reason-0", "reason-1", "reason-2", "reason-3"].map((key) => (
            <View
              key={key}
              className="flex-row items-center gap-2.5 border-b border-[#F4F1EA] px-3.5 py-2.5 last:border-b-0"
            >
              <Skeleton width={20} height={20} radius={10} />
              <Skeleton width="60%" height={13} />
            </View>
          ))}
        </View>
        <Skeleton width="100%" height={70} radius={12} />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: DetailScreen**

```tsx
// src/screens/Detail/DetailScreen.tsx
import { Pressable, ScrollView, Text, View } from "react-native";

import { BackIcon } from "../../components/icons/BackIcon";
import { CheckIcon } from "../../components/icons/CheckIcon";
import { CloseIcon } from "../../components/icons/CloseIcon";
import { ChecklistItem } from "../../components/ChecklistItem";
import { StatusBadge } from "../../components/StatusBadge";
import { checklistFor, computeMatch } from "../../lib/matching";
import { useCourseStore } from "../../store/courseStore";
import { usePetStore } from "../../store/petStore";
import { useToastStore } from "../../store/toastStore";
import { useFacility } from "./api/useFacility";
import { DetailScreenSkeleton } from "./ui/DetailScreenSkeleton";
import type { DetailScreenProps } from "./types";

export function DetailScreen({ navigation, route }: DetailScreenProps) {
  const { facilityId } = route.params;
  const { data: facility, isPending } = useFacility(facilityId);
  const pet = usePetStore((state) => state.pets[0]);
  const savedIds = useCourseStore((state) => state.savedIds);
  const toggleSaved = useCourseStore((state) => state.toggleSaved);
  const checkedPrep = useCourseStore((state) => state.checkedPrep);
  const togglePrep = useCourseStore((state) => state.togglePrep);
  const showToast = useToastStore((state) => state.show);

  if (isPending || !pet) return <DetailScreenSkeleton />;
  if (!facility) return null;

  const match = computeMatch(pet, facility);
  const checklist = checklistFor(facility);
  const saved = savedIds.includes(facility.id);
  const alertFlag = facility.reportCount >= 3;

  return (
    <View className="flex-1 bg-screen">
      <ScrollView>
        <View>
          <View className="h-[210px] bg-[#EEE9E0]" />
          <Pressable
            onPress={() => navigation.goBack()}
            className="absolute left-3.5 top-3.5 h-[34px] w-[34px] items-center justify-center rounded-full bg-white/90"
          >
            <BackIcon color="#1C1C1E" />
          </Pressable>
        </View>
        <View className="px-5 pt-4.5">
          <View className="mb-3 flex-row items-start justify-between gap-2.5">
            <View>
              <Text className="mb-1 text-[11.5px] text-ink-soft">
                {facility.category} · {facility.region}
              </Text>
              <Text className="text-xl font-bold text-ink">{facility.name}</Text>
              <Text className="mt-0.5 text-xs text-ink-soft">{facility.type}</Text>
            </View>
            <StatusBadge status={match.status} />
          </View>
          {alertFlag && (
            <View className="mb-3.5 flex-row items-center gap-2 rounded-xl border border-alert-border bg-alert-bg px-3.5 py-2.5">
              <Text className="flex-1 text-xs font-semibold text-alert-text">
                ⚠ 최근 제보가 누적된 시설이에요 — 방문 전 규정 변경 여부를 다시 확인해보세요
              </Text>
            </View>
          )}
          <View className="mb-5.5 gap-1.5 rounded-2xl border border-card-border bg-card p-3.5">
            <Text className="text-xs text-[#4A4A4C]">{facility.address}</Text>
            <Text className="text-xs text-[#4A4A4C]">{facility.hours}</Text>
            <Text className="text-xs text-ink-faint">최종 데이터 갱신일 {facility.updated}</Text>
          </View>
          <View className="mb-2.5 flex-row items-center justify-between">
            <Text className="text-[15px] font-bold text-ink">조건 매칭 결과</Text>
            <Text className="text-[10.5px] text-ink-faint">{pet.name} 기준</Text>
          </View>
          <View className="mb-2 rounded-2xl border border-card-border bg-card">
            {match.reasons.map((reason, index) => (
              <View
                key={index}
                className="flex-row items-center gap-2.5 border-b border-[#F4F1EA] px-3.5 py-2.5 last:border-b-0"
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full ${
                    reason.ok ? "bg-[#2FA968]" : "bg-[#D64545]"
                  }`}
                >
                  {reason.ok ? <CheckIcon color="#fff" /> : <CloseIcon color="#fff" />}
                </View>
                <Text className="flex-1 text-[13px] text-ink">{reason.label}</Text>
                <Text
                  className={`text-[9.5px] font-bold ${
                    reason.confidence === "확실" ? "text-status-ok-fg" : "text-status-conditional-fg"
                  }`}
                >
                  {reason.confidence}
                </Text>
              </View>
            ))}
          </View>
          <View className="mb-2.5 rounded-xl border border-dashed border-quote-border bg-quote-bg px-3.5 py-3">
            <Text className="mb-1.5 text-[10.5px] font-bold text-[#9A8B6E]">원문 근거</Text>
            <Text className="text-xs italic leading-5 text-quote-text">&quot;{facility.rawText}&quot;</Text>
          </View>
          <Text className="mb-6 text-[10.5px] leading-5 text-ink-faint">
            &apos;확실&apos;은 원문에 조건이 명시된 경우, &apos;추정&apos;은 원문이 모호해 일반 기준을
            적용한 경우예요.
          </Text>
          <Text className="mb-2.5 text-[15px] font-bold text-ink">동반 준비물</Text>
          <View className="mb-5 rounded-2xl border border-card-border bg-card p-1">
            {checklist.map((item) => (
              <ChecklistItem
                key={item}
                label={item}
                checked={!!checkedPrep[item]}
                onToggle={() => togglePrep(item)}
              />
            ))}
          </View>
          <Pressable
            onPress={() => showToast("제보가 접수되었어요. 검토 후 반영할게요")}
            className="mb-3.5 rounded-2xl border border-card-border-alt bg-card p-3.5"
          >
            <Text className="text-center text-[13px] font-semibold text-ink-soft">
              실제 규정이 다른가요? 제보하기
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <View className="px-5 pb-6.5 pt-3">
        <Pressable
          onPress={() => {
            const nowSaved = toggleSaved(facility.id);
            showToast(nowSaved ? "코스에 담았어요" : "코스에서 제거했어요");
          }}
          className={`rounded-2xl p-4 ${saved ? "bg-status-check-bg" : "bg-primary"}`}
        >
          <Text className={`text-center text-[14.5px] font-bold ${saved ? "text-ink-soft" : "text-white"}`}>
            {saved ? "코스에서 제거하기" : "코스에 담기"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: constants.ts는 이 화면엔 상수가 없으므로 빈 파일 유지, index.ts는 기존 그대로**

- [ ] **Step 6: 검증**

Run: `yarn typecheck`

- [ ] **Step 7: 커밋**

```bash
git add src/screens/Detail
git commit -m "feat: implement facility detail screen"
```

---

### Task 11: 내 여행 코스 화면 구현

**Files:**
- Create: `src/screens/Course/index.ts`
- Create: `src/screens/Course/CourseScreen.tsx`
- Create: `src/screens/Course/types.ts`
- Create: `src/screens/Course/api/useCourseFacilities.ts`

**Interfaces:**
- Consumes: `useCourseStore`(Task 3), `fetchFacilities`(Task 4), `computeMatch`/`mergeChecklists`(Task 2), `SavedFacilityRow`/`SavedFacilityRowSkeleton`/`ChecklistItem`/`EmptyState`(Task 6)
- 로딩 처리(Global Constraints "UI 널뛰기 금지"): `isPending` 동안에는 `saved.length === 0`이 우연히 참이어도 **EmptyState를 먼저 보여줬다가 데이터 도착 후 리스트로 바뀌는 것을 금지**한다 — `isPending`을 empty 판정보다 먼저 확인해 스켈레톤 리스트를 렌더링한다.

- [ ] **Step 1: 화면 타입**

```ts
// src/screens/Course/types.ts
import type { MainTabScreenProps } from "../../navigation/types";

export type CourseScreenProps = MainTabScreenProps<"Course">;
```

- [ ] **Step 2: 쿼리 훅**

```ts
// src/screens/Course/api/useCourseFacilities.ts
import { useQuery } from "@tanstack/react-query";

import { fetchFacilities } from "../../../lib/facilities";

export function useCourseFacilities() {
  return useQuery({ queryKey: ["facilities"], queryFn: fetchFacilities });
}
```

- [ ] **Step 3: CourseScreen**

```tsx
// src/screens/Course/CourseScreen.tsx
import { FlatList, Text, View } from "react-native";

import { ChecklistItem } from "../../components/ChecklistItem";
import { EmptyState } from "../../components/EmptyState";
import { SavedFacilityRow } from "../../components/SavedFacilityRow";
import { SavedFacilityRowSkeleton } from "../../components/SavedFacilityRowSkeleton";
import { computeMatch, mergeChecklists } from "../../lib/matching";
import { useCourseStore } from "../../store/courseStore";
import { usePetStore } from "../../store/petStore";
import { useCourseFacilities } from "./api/useCourseFacilities";
import type { CourseScreenProps } from "./types";

const SKELETON_KEYS = ["skeleton-0", "skeleton-1"];

export function CourseScreen({ navigation }: CourseScreenProps) {
  const pet = usePetStore((state) => state.pets[0]);
  const savedIds = useCourseStore((state) => state.savedIds);
  const toggleSaved = useCourseStore((state) => state.toggleSaved);
  const checkedPrep = useCourseStore((state) => state.checkedPrep);
  const togglePrep = useCourseStore((state) => state.togglePrep);
  const { data: facilities, isPending } = useCourseFacilities();

  const saved = facilities ? facilities.filter((f) => savedIds.includes(f.id)) : [];
  const mergedChecklist = mergeChecklists(saved);

  if (isPending) {
    return (
      <View className="flex-1 bg-screen px-5 pt-4">
        <Text className="mb-1 text-lg font-bold text-ink">내 여행 코스</Text>
        <FlatList
          data={SKELETON_KEYS}
          keyExtractor={(key) => key}
          renderItem={() => <SavedFacilityRowSkeleton />}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-screen px-5 pt-4">
      <Text className="mb-1 text-lg font-bold text-ink">내 여행 코스</Text>
      <Text className="mb-4.5 text-[12.5px] text-ink-soft">담은 시설 {saved.length}곳</Text>
      {saved.length === 0 || !pet ? (
        <EmptyState
          title="아직 담은 시설이 없어요"
          description={"검색결과에서 마음에 드는 시설을\n코스에 담아보세요"}
        />
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SavedFacilityRow
              facility={item}
              match={computeMatch(pet, item)}
              order={index + 1}
              onPress={() =>
                navigation.getParent()?.navigate("Detail", { facilityId: item.id })
              }
              onRemove={() => toggleSaved(item.id)}
            />
          )}
          ListFooterComponent={
            <>
              <Text className="mb-1.5 mt-5.5 text-[15px] font-bold text-ink">통합 준비물</Text>
              <Text className="mb-2.5 text-[11.5px] text-ink-soft">
                담은 시설의 조건을 합쳐 중복 없이 정리했어요
              </Text>
              <View className="mb-8 rounded-2xl border border-card-border bg-card p-1">
                {mergedChecklist.map((item) => (
                  <ChecklistItem
                    key={item}
                    label={item}
                    checked={!!checkedPrep[item]}
                    onToggle={() => togglePrep(item)}
                  />
                ))}
              </View>
            </>
          }
        />
      )}
    </View>
  );
}
```

- [ ] **Step 4: index.ts**

```ts
// src/screens/Course/index.ts
export { CourseScreen as default } from "./CourseScreen";
```

- [ ] **Step 5: 검증**

Run: `yarn typecheck`

- [ ] **Step 6: 커밋**

```bash
git add src/screens/Course
git commit -m "feat: implement course screen"
```

---

### Task 12: 오프라인 보관함 화면 구현

**Files:**
- Create: `src/screens/Offline/index.ts`
- Create: `src/screens/Offline/OfflineScreen.tsx`
- Create: `src/screens/Offline/types.ts`
- Create: `src/screens/Offline/api/useOfflineFacilities.ts`

**Interfaces:**
- Consumes: `useOfflineStore`(Task 3), `useCourseStore`(Task 3), `fetchFacilities`(Task 4), `mergeChecklists`(Task 2), `ToggleSwitch`/`ChecklistItem`/`EmptyState`/`SavedFacilityRowSkeleton`(Task 6)
- 로딩 처리(Global Constraints "UI 널뛰기 금지"): Task 11(코스 화면)과 동일하게 `isPending`을 empty 판정보다 먼저 확인해 스켈레톤 리스트를 렌더링한다.

**주의 (범위 확인 필요):** README는 이 토글을 "기기에 저장"이라 부르지만 실제 로컬 영속화(AsyncStorage 등)는 프로토타입에 없다. 이 태스크는 프로토타입과 동일하게 **인메모리 `offlineSaved` 플래그**만 구현한다 — 앱 재시작 시에도 유지되는 실제 오프라인 저장은 스코프 밖이며 별도 태스크로 분리해야 한다(팀 확인 필요, Global Constraints 참고).

- [ ] **Step 1: 화면 타입**

```ts
// src/screens/Offline/types.ts
import type { MainTabScreenProps } from "../../navigation/types";

export type OfflineScreenProps = MainTabScreenProps<"Offline">;
```

- [ ] **Step 2: 쿼리 훅**

```ts
// src/screens/Offline/api/useOfflineFacilities.ts
import { useQuery } from "@tanstack/react-query";

import { fetchFacilities } from "../../../lib/facilities";

export function useOfflineFacilities() {
  return useQuery({ queryKey: ["facilities"], queryFn: fetchFacilities });
}
```

- [ ] **Step 3: OfflineScreen**

```tsx
// src/screens/Offline/OfflineScreen.tsx
import { FlatList, Text, View } from "react-native";

import { ChecklistItem } from "../../components/ChecklistItem";
import { EmptyState } from "../../components/EmptyState";
import { SavedFacilityRow } from "../../components/SavedFacilityRow";
import { SavedFacilityRowSkeleton } from "../../components/SavedFacilityRowSkeleton";
import { ToggleSwitch } from "../../components/ToggleSwitch";
import { computeMatch, mergeChecklists } from "../../lib/matching";
import { useCourseStore } from "../../store/courseStore";
import { useOfflineStore } from "../../store/offlineStore";
import { usePetStore } from "../../store/petStore";
import { useOfflineFacilities } from "./api/useOfflineFacilities";
import type { OfflineScreenProps } from "./types";

const SKELETON_KEYS = ["skeleton-0", "skeleton-1"];

export function OfflineScreen(_props: OfflineScreenProps) {
  const pet = usePetStore((state) => state.pets[0]);
  const savedIds = useCourseStore((state) => state.savedIds);
  const checkedPrep = useCourseStore((state) => state.checkedPrep);
  const togglePrep = useCourseStore((state) => state.togglePrep);
  const offlineSaved = useOfflineStore((state) => state.offlineSaved);
  const setOfflineSaved = useOfflineStore((state) => state.setOfflineSaved);
  const { data: facilities, isPending } = useOfflineFacilities();

  const saved = facilities ? facilities.filter((f) => savedIds.includes(f.id)) : [];
  const mergedChecklist = mergeChecklists(saved);

  return (
    <View className="flex-1 bg-screen px-5 pt-4">
      <Text className="mb-1.5 text-lg font-bold text-ink">오프라인 보관함</Text>
      <Text className="mb-4.5 text-[12.5px] leading-5 text-ink-soft">
        여행 현장에서 네트워크 없이도 코스와 준비물을 확인할 수 있어요
      </Text>
      <View className="mb-5 flex-row items-center justify-between rounded-2xl border border-card-border bg-card p-4">
        <View>
          <Text className="mb-1 text-sm font-bold text-ink">기기에 저장</Text>
          <Text className="text-[11.5px] text-ink-soft">
            {offlineSaved ? "오프라인에 저장됨 · 네트워크 없이 확인 가능" : "아직 오프라인에 저장하지 않았어요"}
          </Text>
        </View>
        <ToggleSwitch value={offlineSaved} onToggle={() => setOfflineSaved(!offlineSaved)} />
      </View>
      {isPending ? (
        <FlatList
          data={SKELETON_KEYS}
          keyExtractor={(key) => key}
          renderItem={() => <SavedFacilityRowSkeleton />}
        />
      ) : saved.length === 0 || !pet ? (
        <EmptyState
          title="저장할 코스가 아직 없어요"
          description={"코스 탭에서 시설을 담으면\n여기서 오프라인으로 저장할 수 있어요"}
        />
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SavedFacilityRow facility={item} match={computeMatch(pet, item)} order={index + 1} />
          )}
          ListFooterComponent={
            <>
              <Text className="mb-1.5 mt-5 text-[15px] font-bold text-ink">통합 준비물</Text>
              <View className="mb-8 rounded-2xl border border-card-border bg-card p-1">
                {mergedChecklist.map((item) => (
                  <ChecklistItem
                    key={item}
                    label={item}
                    checked={!!checkedPrep[item]}
                    onToggle={() => togglePrep(item)}
                  />
                ))}
              </View>
            </>
          }
        />
      )}
    </View>
  );
}
```

- [ ] **Step 4: index.ts**

```ts
// src/screens/Offline/index.ts
export { OfflineScreen as default } from "./OfflineScreen";
```

- [ ] **Step 5: 검증**

Run: `yarn typecheck`

- [ ] **Step 6: 커밋**

```bash
git add src/screens/Offline
git commit -m "feat: implement offline screen"
```

---

### Task 13: 마이페이지 화면 구현

**Files:**
- Create: `src/screens/MyPage/index.ts`
- Create: `src/screens/MyPage/MyPageScreen.tsx`
- Create: `src/screens/MyPage/types.ts`

**Interfaces:**
- Consumes: `usePetStore`(Task 3), `PetProfileCard`(Task 7에서 공용으로 승격됨)

**주의 (범위 확인 필요):** README에 "알림 설정 / 데이터 출처 안내 / 로그아웃은 상세 동작 미정, 구현 시 팀 확인 필요"라고 명시되어 있다. 이 태스크는 눌러도 아무 동작 없는 리스트 항목으로만 구현한다 — 실제 동작(알림 권한 요청, 로그아웃 플로우 등)은 별도 태스크로 분리한다.

- [ ] **Step 1: 화면 타입**

```ts
// src/screens/MyPage/types.ts
import type { MainTabScreenProps } from "../../navigation/types";

export type MyPageScreenProps = MainTabScreenProps<"MyPage">;
```

- [ ] **Step 2: MyPageScreen**

```tsx
// src/screens/MyPage/MyPageScreen.tsx
import { Pressable, ScrollView, Text, View } from "react-native";

import { PetProfileCard } from "../../components/PetProfileCard";
import { usePetStore } from "../../store/petStore";
import type { MyPageScreenProps } from "./types";

const ACCOUNT_ITEMS = ["알림 설정", "데이터 출처 안내", "로그아웃"];

export function MyPageScreen(_props: MyPageScreenProps) {
  const pets = usePetStore((state) => state.pets);
  const addPet = usePetStore((state) => state.addPet);
  const updatePet = usePetStore((state) => state.updatePet);
  const removePet = usePetStore((state) => state.removePet);

  return (
    <ScrollView className="flex-1 bg-screen" contentContainerClassName="px-5 pb-8 pt-4">
      <Text className="mb-5 text-lg font-bold text-ink">마이페이지</Text>
      <Text className="mb-2.5 text-xs font-bold text-ink-soft">반려동물 프로필</Text>
      {pets.map((pet) => (
        <PetProfileCard
          key={pet.id}
          pet={pet}
          onChange={(patch) => updatePet(pet.id, patch)}
          onRemove={() => removePet(pet.id)}
        />
      ))}
      <Pressable
        onPress={addPet}
        className="mb-2 w-full rounded-2xl border-[1.5px] border-dashed border-[#C9CABF] p-3.5"
      >
        <Text className="text-center text-[13px] font-semibold text-ink-soft">+ 반려동물 추가</Text>
      </Pressable>
      <Text className="mb-2.5 mt-6 text-xs font-bold text-ink-soft">계정</Text>
      <View className="overflow-hidden rounded-2xl border border-card-border bg-card">
        {ACCOUNT_ITEMS.map((label, index) => (
          <View
            key={label}
            className={`px-4 py-3.5 ${index < ACCOUNT_ITEMS.length - 1 ? "border-b border-[#F4F1EA]" : ""}`}
          >
            <Text className={`text-[13.5px] ${label === "로그아웃" ? "text-alert-text" : "text-ink"}`}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 3: index.ts**

```ts
// src/screens/MyPage/index.ts
export { MyPageScreen as default } from "./MyPageScreen";
```

- [ ] **Step 4: 검증**

Run: `yarn typecheck`

- [ ] **Step 5: 커밋**

```bash
git add src/screens/MyPage
git commit -m "feat: implement my page screen"
```

---

### Task 14: SVG 아이콘 세트 구성

**Files:**
- Create: `src/components/icons/BackIcon.tsx`
- Create: `src/components/icons/SearchIcon.tsx`
- Create: `src/components/icons/LocationPinIcon.tsx`
- Create: `src/components/icons/CheckIcon.tsx`
- Create: `src/components/icons/CloseIcon.tsx`
- Create: `src/components/icons/TabHomeIcon.tsx`
- Create: `src/components/icons/TabCourseIcon.tsx`
- Create: `src/components/icons/TabOfflineIcon.tsx`
- Create: `src/components/icons/TabMypageIcon.tsx`

**Interfaces:**
- Produces: 각 아이콘 컴포넌트는 `{ color: string }` props를 받는다. Task 5(탭바), Task 6(ChecklistItem), Task 9/10(Search/Detail 뒤로가기, 매칭 결과 체크/X)가 이미 이 이름으로 import하고 있었으므로 정확히 맞춘다.

- [ ] **Step 1: `react-native-svg` 설치**

Run: `npx expo install react-native-svg`

- [ ] **Step 2: 프로토타입 인라인 SVG를 컴포넌트로 이식**

```tsx
// src/components/icons/BackIcon.tsx
import Svg, { Path } from "react-native-svg";

export function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={8} height={14} viewBox="0 0 8 14">
      <Path
        d="M7 1L1 7l6 6"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

```tsx
// src/components/icons/SearchIcon.tsx
import Svg, { Circle, Path } from "react-native-svg";

export function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Circle cx={7} cy={7} r={5.5} stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M11 11L14.5 14.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
```

```tsx
// src/components/icons/LocationPinIcon.tsx
import Svg, { Circle, Path } from "react-native-svg";

export function LocationPinIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C12 21 5 14.5 5 9.5C5 5.9 8.1 3 12 3C15.9 3 19 5.9 19 9.5C19 14.5 12 21 12 21Z"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
      />
      <Circle cx={12} cy={9.5} r={2.3} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}
```

```tsx
// src/components/icons/CheckIcon.tsx
import Svg, { Path } from "react-native-svg";

export function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={10} height={8} viewBox="0 0 10 8">
      <Path
        d="M1 4L3.5 6.5L9 1"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

```tsx
// src/components/icons/CloseIcon.tsx
import Svg, { Path } from "react-native-svg";

export function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={8} height={8} viewBox="0 0 8 8">
      <Path d="M1 1L7 7M7 1L1 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
```

```tsx
// src/components/icons/TabHomeIcon.tsx
import Svg, { Path } from "react-native-svg";

export function TabHomeIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 11L12 4L20 11V19A1 1 0 0 1 19 20H5A1 1 0 0 1 4 19V11Z"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

```tsx
// src/components/icons/TabCourseIcon.tsx
import Svg, { Path } from "react-native-svg";

export function TabCourseIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19V7C4 5.9 4.9 5 6 5H10L12 8H18C19.1 8 20 8.9 20 10V19"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

```tsx
// src/components/icons/TabOfflineIcon.tsx
import Svg, { Path } from "react-native-svg";

export function TabOfflineIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3V15M12 15L8 11M12 15L16 11"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 17V19A2 2 0 0 0 6 21H18A2 2 0 0 0 20 19V17"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
```

```tsx
// src/components/icons/TabMypageIcon.tsx
import Svg, { Circle, Path } from "react-native-svg";

export function TabMypageIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.4} stroke={color} strokeWidth={1.8} />
      <Path
        d="M5 20C5 16.5 8.1 14 12 14C15.9 14 19 16.5 19 20"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
```

- [ ] **Step 3: 검증**

Run: `yarn typecheck` — Task 5/6/9/10에서 남아있던 아이콘 import 에러가 모두 해소되어야 함.

- [ ] **Step 4: 커밋**

```bash
git add src/components/icons package.json yarn.lock
git commit -m "feat: add svg icon set"
```

---

### Task 15: 실제 관광공사 API 연동 (백엔드 계약 확정 후 — blocked)

**현재 blocked 사유:** 백엔드의 관광공사 반려동반 여행정보 API 래퍼가 아직 없고, README가 핵심 차별화 지점이라 명시한 `confidence`(확실/추정)·`rawText`(원문 근거) 필드가 실제 API 계약에 포함되는지 확정되지 않았다. 이 두 필드 없이 연동하면 Task 10(시설 상세)의 매칭 결과/원문 근거 UI가 깨지므로, 아래 계약이 백엔드와 합의되기 전까지는 구체적인 bite-sized step을 작성할 수 없다.

**연동 시점에 해야 할 일 (합의된 계약이 생기면 이 섹션을 bite-sized 태스크로 다시 쪼갤 것):**
- `src/lib/facilities.ts`의 `fetchFacilities`/`fetchFacilityById` 내부만 `apiFetch<Facility[]>("/facilities")`/`apiFetch<Facility>(`/facilities/${id}`)` 호출로 교체 (화면 쪽 코드는 무변경 — Task 4에서 설계한 분리 지점).
- API의 `contenttypeid` 8종(관광지/문화시설/축제행사/레포츠/숙박/쇼핑/음식/교통)을 `FacilityCategory`(Task 2) 8종과 1:1 매핑하는 변환 함수 추가.
- 이미지 URL 필드를 `Facility`에 추가하고 `FacilityListCard`/`FacilityCarouselCard`/상세 화면의 placeholder 박스를 실제 이미지 컴포넌트로 교체.
- `reportCount` 임계값(현재 3, 목업값)을 백엔드 정책값으로 교체.
- TanStack Query의 `queryClient`(이미 세팅됨, `src/lib/queryClient.ts`) 기본 `staleTime`이 실 API 트래픽 패턴에 맞는지 재검토.

---

## Self-Review

**Spec coverage:** README의 화면 1~7(온보딩/홈/검색결과/상세/코스/오프라인/마이페이지), 네비게이션(탭 4개+스택), Interactions(체중 슬라이더 전역 재계산=Zustand, 토스트 1.8초, 산책친화 커스텀 필터, 뒤로가기 스택), State Management(pets/savedIds/checkedPrep/offlineSaved 전부 스토어화, 시설 데이터+매칭 로직), Data Requirements(목업→실API 분리 지점), Assets(SVG 아이콘, Pretendard 폰트) 모두 위 15개 태스크로 매핑됨. Design Tokens는 Task 1에서 전량 반영.
**Placeholder scan:** "TBD/나중에" 식 표현 없음. Task 12(오프라인 실제 영속화)와 Task 13(계정 메뉴 동작), Task 15(실 API)는 README 자체가 "팀 확인 필요"라 명시한 항목이라 의도적으로 스코프 밖으로 명시하고 별도 후속 태스크로 분리했다(placeholder 코드가 아니라 범위 배제).
**Type consistency:** `Facility`/`Pet`/`MatchResult`/`MatchStatus`(Task 2)가 Task 3~13 전체에서 동일한 이름·필드로 재사용됨을 확인. `RootStackScreenProps`/`MainTabScreenProps`(Task 5)가 Task 7~13의 모든 `types.ts`에서 동일하게 사용됨을 확인. 아이콘 컴포넌트 props `{ color: string }`이 Task 5/6/9/10의 사용부와 Task 14의 정의부에서 일치함을 확인.
**UI 널뛰기 재확인 (사용자 피드백 반영):** Task 8/9/11/12에서 `data ?? []` 패턴을 전부 `isPending` 분기로 교체했고, `FacilityCarouselCardSkeleton`/`FacilityListCardSkeleton`/`SavedFacilityRowSkeleton`(Task 6)이 각각 대응하는 실제 카드/행과 동일한 outer 치수를 갖는지 확인. Task 10은 기존 `if (!facility || !pet) return null` 대신 `DetailScreenSkeleton`으로 교체. Task 11/12는 로딩 중 `EmptyState`가 먼저 보였다가 리스트로 바뀌는 경로를 제거하기 위해 `isPending` 분기를 empty 판정보다 앞에 뒀는지 확인. 토큰 절약을 위해 태스크별 검증에서 `expo export` 등 번들 스모크 테스트를 제거하고 `yarn typecheck` 단일 게이트로 통일.
