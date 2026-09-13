# Elasticsearch 설계

**대상**: NestJS API 서버 담당자 (ES 를 읽는 쪽)
**기준**: 2026-09-13 · `TAGGER_VERSION 1.2.0` · ES 8.15.3 (Basic 라이선스)
**구현**: `pettour/es.py` (매핑·분석기), `pettour/transform.py` (문서 변환), `pettour/tagging.py` (조건 추출)

이 문서는 **인덱스가 왜 이렇게 생겼는지**를 설명한다. 용도가 겹치는 문서가 둘 더 있다.

| 문서 | 볼 때 |
|---|---|
| 이 문서 | 필드 의미·설계 이유·운영 규칙 |
| `docs/검색-API-스펙.md` | 엔드포인트별 **완성형 쿼리**와 응답 형태. 구현할 때는 이쪽을 복사해 쓴다 |
| `docs/멍냥로드-ES-연동명세서.xlsx` | 필드 전체 목록 표. 스크립트가 생성하므로 손으로 고치지 않는다 |
| `docs/erd-설계.md` §4 | `report.*` 역류(Postgres → ES) 절차 |

---

## 0. 먼저 — 어기면 조용히 틀리는 것

셋 다 에러 없이 **틀린 결과**가 나간다. 전부 실측으로 확인된 함정이다.

| # | 규칙 | 안 지키면 |
|---|---|---|
| 0 | 모든 검색에 `must_not: {term: {pet_tags.pet_allowed: false}}` | 동반 **불가** 17건(숙박 15건)이 '확인 필요'로 섞여 나온다 |
| 1 | 모든 검색에 `filter: {term: {sync.is_active: true}}` | 폐업·종료 461건(2026-09-08 실측, 매일 변한다)이 노출된다 |
| 2 | `highlight` 에는 `highlight_query` 를 함께 | `filter` 전용 쿼리는 강조할 매칭이 없어 근거가 전부 빈 값이 된다 (§3) |
| 3 | 검색어가 없으면 `must: [{match_all: {}}]` 를 깐다 | `function_score` 가 전부 score 0 이 된다 (§3) |
| 4 | RRF(`retriever.rrf`) 금지 | Basic 라이선스에서 `403`. 하이브리드는 `knn` + `query` 점수 합산 (§5) |
| 5 | 인덱스 이름이 아니라 **별칭**(`pettour-place`)으로 접근 | 실제 인덱스는 재색인 때마다 `-v1` → `-v2` → … 로 바뀐다. 지금은 `-v2` |
| 6 | 죽은 필드에 필터 금지: `region.area_code` `region.sigungu_code` `category.cat1~3` | 이 API 는 전부 빈 값으로 준다. 걸면 항상 0건. 지역은 `region.ldong_*`, 분류는 `category.lcls1~3` |

---

## 1. 기존 RAG 매핑과 무엇이 다른가

참고로 받은 매핑은 **RAG 청크 인덱스**였다. 이번 건과는 문서의 단위 자체가 다르다.

| | 기존 (RAG 청크) | 이번 (멍냥로드) |
|---|---|---|
| 문서 1건 | 텍스트 청크 | **시설 1건** (`_id = contentid`) |
| `_id` | chunk_id | contentid — **upsert 병합의 키** |
| 검색 방식 | 벡터 유사도 위주 | **정형 필터 위주** + 텍스트/벡터 보조 |
| 갱신 | 전체 재색인 | **부분 병합**(`doc_as_upsert`) |
| 핵심 요구 | 의미적 근접 | **수치 판정의 정확성** |

### 가져온 것
- `korean_analyzer` 계열 커스텀 분석기 구성
- text + keyword 멀티필드 (정렬/집계 겸용 — 이번엔 서브필드 이름이 `.kw`)
- 관련 필드를 그룹으로 묶는 구조 (`metadata.*` → 이번엔 `category/region/pet_raw/pet_tags/sync`)
- 청크 단위 임베딩 (§5)

### 고친 것
| 기존 | 문제 | 이번 |
|---|---|---|
| `"filter": [..., "stop"]` | 설정 없는 `stop`은 **영어 불용어**라 한국어에 무효 | `nori_part_of_speech` + stoptags 로 조사/어미 제거 |
| `nori_user_dict` 라는 이름 | 정작 `user_dictionary`가 **미지정** | `analysis/pet_user_dict.txt` 실제 지정 (견종명·장비명) |
| 분석기 1개 | 색인/검색 동일 | `korean`(색인) / `korean_search`(검색, 동의어 포함) 분리 |
| 동의어 없음 | 표기 흔들림 미흡수 | `synonym_graph` + `updateable: true` → **재색인 없이 사전 갱신** |
| `dense_vector` 필수 | — | **선택**으로 강등 (§5) |
| 청크를 독립 문서로 | kNN 에 시설 조건 필터를 못 건다 | `nested` 로 시설 문서 안에 둔다 (§5) |

---

## 2. 인덱스와 문서 구조

### 인덱스 4개

| 별칭 / 인덱스 | 내용 | 규모 | NestJS 가 |
|---|---|---|---|
| `pettour-place` → `pettour-place-v2` | **시설 마스터 카탈로그**. `_id = contentid` | 10,152건 (활성 ~9,690 · MVP 5종 활성 ~1,037) | 읽는다. `report.*` 만 쓴다 |
| `pettour-code` → `pettour-code-v1` | 지역(법정동)·분류체계 코드 → 이름표 | 수백 건 | 읽는다 |
| `pettour-review` | 태깅 수동 검수 큐 | ~219건 | 안 쓴다 (Kibana 용) |
| `pettour-runlog` | 배치 실행 이력 | 일 몇 건 | 안 쓴다 |

place 문서에는 **코드만** 들어 있다(`category.lcls1~3`, `region.ldong_*`).
화면에 이름을 붙이려면 `pettour-code` 를 조인해야 한다 — 안 하면 `VE03` 같은 코드가 그대로 노출된다.
`pettour-code` 의 `path`(예: `문화관광 > 도시공원`)는 조인 없이 바로 쓰는 표시용 경로다.

### place 문서

```
pettour-place  (→ -v2)   _id = contentid
│
├─ content_id, title, overview, tel, tel_name, homepage_url, addr1/2, zipcode
├─ location            geo_point            ← 반경 검색
├─ category.*          content_type_id · lcls1~3        ← 필터/집계 (cat1~3 은 빈 값)
├─ region.*            ldong_regn_cd · ldong_signgu_cd  ← 필터/집계 (area_code 등은 빈 값)
├─ media.*             first_image · thumb · images[]   ← 표시 전용 (images 는 enabled:false)
│
├─ pet_raw.*           동반조건 원문 9종        ← nori 분석, highlight 근거
├─ pet_tags.*          구조화 조건 태그 23필드   ← 정형 필터 · function_score
├─ pet_evidence[]      태깅 근거               ← 저장 전용 (enabled:false)
│
├─ intro               운영시간/휴무일 등       ← 저장 전용 (enabled:false), TTL 재조회 대상
├─ info / info_count   반복정보 · 숙박 객실     ← 저장 전용 (enabled:false)
├─ semantic[]          청크 벡터 (선택, nested)  ← 자연어 탐색 전용. 현재 0건
├─ report.*            제보 집계               ← ★ NestJS 가 쓰는 유일한 서브트리
└─ sync.*              수집 상태 · 시각 · 플래그  ← 백필 커서 · 신선도
```

어느 API 오퍼레이션이 어느 필드를 채우는지:

| 오퍼레이션 | 채우는 곳 |
|---|---|
| `areaBasedList2` / `petTourSyncList2` | 기본 정보, `location`, `category`, `region`, `sync.is_active` |
| `detailCommon2` | `overview`, `homepage_url` |
| `detailPetTour2` | `pet_raw.*` + `pet_tags.*` + `pet_evidence` |
| `detailIntro2` | `intro` (7일 TTL 로 재조회) |
| `detailInfo2` | `info`, `info_count` |
| `detailImage2` | `media.images`, `media.image_count` |

상세 5종은 **하루 1,000회 쿼터**에 묶여 며칠에 걸쳐 도착하고, 한 문서에 부분 병합된다.
그래서 **어떤 서브트리든 비어 있을 수 있다** — 없는 필드는 "아직 모름"으로 다룬다.

### 설계 판단 4가지

**① `pet_raw`(원문)와 `pet_tags`(태그)를 같은 문서에 둔다**
태그만 있으면 "왜 조건부인지" 설명할 수 없다. 태그로 **필터링**하고, 원문 `highlight`로 **근거를 제시**한다.
이 쌍이 깨지면 "설명 가능한 매칭"이 죽는다.

**② `pet_evidence`·`intro`·`info` 는 nested 가 아니라 `enabled: false`**
nested 는 문서당 서브도큐먼트를 별도 생성해 비용이 크다. 셋 다 **표시만 하고 검색하지 않는다.**
대가: **검색·필터·집계가 불가능하다** — "지금 영업 중인 곳만" 같은 필터는 ES 로 못 건다.
"어떤 규칙이 적용됐는지"로 거를 일은 `pet_tags.matched_rules`(keyword 배열)가 대신한다.

**③ `dynamic: false`**
API가 필드를 추가해도 매핑이 폭증하지 않는다. `_source`에는 남으므로 데이터 손실은 없다.
반대로 **매핑에 없는 필드에 range/exists 를 걸면 에러 없이 0건**이 나온다.

**④ 삭제를 알려주지 않는 API 대응 — 지우지 않고 `sync.is_active: false`**
`showflag=0`(폐업·표출중단)이거나 전수 목록에서 7일 넘게 사라지면 비활성으로 돌린다.
목록에서 사라져 비활성이 된 건에만 `sync.inactive_reason: unlisted` 와 `sync.deactivated_at` 이 찍힌다.
`showflag=0` 으로 내려간 건(대부분)은 현재 두 필드가 **비어 있다** — 매핑 주석의 `showflag` 값은 아직 쓰이지 않는다.
사유 표시에 의존하지 말고 `is_active` 만 믿을 것.
문서를 지우지 않으므로 **§0-1 필터가 없으면 폐업 시설이 그대로 나간다.**

---

## 3. `pet_tags` — NestJS 와의 계약

**2026-08-24 결정: 최종 판정(`allowed`/`conditional`/`denied`)은 NestJS 가 소유한다.**
배치는 원문 → `pet_tags` 추출(`tagging.extract()`)까지만 하고, 판정 로직은 `_source`의 `pet_tags`를 읽어 앱에서 계산한다.
따라서 계약 수단은 코드가 아니라 **아래 필드와 어휘**다. 바뀌면 `TAGGER_VERSION` 을 올리고 사전 통보한다.

### 가장 중요한 규칙 — 부재 ≠ false

값이 없는 태그는 **필드 자체가 빠진다.** `false` 는 원문에 명시된 판정일 때만 남는다.

| 상태 | 의미 |
|---|---|
| `cage_required: true` | 원문에 이동장 필수라고 있다 |
| `cage_required: false` | 원문에 이동장 불필요라고 **명시**돼 있다 |
| 필드 없음 | **모른다.** false 로 취급하면 안 된다 |

### 필드

| 필드 | 타입 | 값 / 의미 |
|---|---|---|
| `pet_allowed` | boolean | `false` = 동반 불가 확정(안내견·보조견 전용 포함, 17건). 부재 = 명시 근거 없음. `true` 는 쓰지 않는다 (v1.1.0) |
| `weight_limit_kg` | float | 체중 상한 |
| `weight_op` | keyword | `lte`(이하) \| `lt`(미만) — 경계값 판정은 앱에서 |
| `weight_is_estimated` | boolean | 체중을 크기 표현("소형견")에서 역산했으면 true |
| `size_max` | keyword | `초소형` `소형` `중소형` `중형` `중대형` `대형` \| `제한없음` |
| `max_pets` | integer | 동반 가능 마릿수 |
| `breed_excluded` | keyword[] | 현재 어휘는 `맹견` 하나 |
| `leash_required` `cage_required` `manner_belt_required` `vaccination_required` `poop_bag_required` | boolean | 준비물·요건 |
| `muzzle_required` | boolean | **무조건** 입마개 필수일 때만 true (61건) |
| `muzzle_required_for_dangerous` | boolean | 맹견 등에 **한해** 필수 (633건). v1.2.0 에서 분리 — 섞으면 소형견 보호자 준비물에 입마개가 뜬다 |
| `stroller_allowed` | boolean | 유모차(펫 스트롤러) |
| `area_scope` | keyword | `all`(전 구역) \| `partial`(일부 구역) |
| `indoor_allowed` `outdoor_allowed` | boolean | 실내/실외 |
| `confidence` | keyword | `certain` \| `estimated` \| `unknown` |
| `confidence_score` | float | 위를 수치화: 1.0 / 0.6 / 0.2 — `field_value_factor` 용 |
| `matched_rules` | keyword[] | 적용된 추출 규칙 id (검수·집계용) |
| `tagger_version` | keyword | 이 태그를 만든 규칙 버전 |
| `tagged_at` | date | |

신뢰도 분포(MVP 5종 활성 기준, v1.2.0 전수): **확실 78.9%**. 동반 불가 17건도 원문 명시라 '확실'에 포함된다.

`pet_raw` 9종 — 원문 필드명과의 대응:

| `pet_raw.*` | 원문 | 비고 |
|---|---|---|
| `area_type` | `acmpyTypeCd` | 전구역/일부구역 |
| `possible_pet` | `acmpyPsblCpam` | ★ 체중·크기 추출 주 소스 |
| `need_matter` | `acmpyNeedMtr` | 콤마 구분 통제어휘 (목줄, 이동장 …) |
| `etc_info` | `etcAcmpyInfo` | ★ 실내외·맹견·배변 |
| `risk_matter` | `relaAcdntRiskMtr` | possible_pet 과 90% 중복 |
| `facility` `rental` `purchase` `furnish` | `relaPosesFclty` 등 | 보유시설·대여·구매·비치 물품 |

재태깅은 `pet_tags`·`pet_evidence` 서브트리를 **통째로 교체**한다(병합 아님). 예전 버전에만 있던 필드가 남지 않는다.

---

## 4. 조건 매칭 쿼리

**ES 는 후보를 좁히고, 최종 판정은 앱이 한다.** `weight_op` 경계, '추정'일 때 강등, 이동장 미소지 처리 같은 규칙을
쿼리 DSL 로 쓰면 읽기 어렵고 규칙이 바뀔 때 쿼리와 코드가 따로 논다.
아래는 설계 설명용 골격이고, 엔드포인트용 완성형은 `docs/검색-API-스펙.md` §2 에 있다.

```jsonc
// 13kg 반려견, 부산, MVP 5종
POST pettour-place/_search
{
  "query": {
    "bool": {
      "filter": [
        { "term":  { "sync.is_active": true } },                                   // §0-1
        { "terms": { "category.content_type_id": ["12","14","28","32","39"] } },
        { "term":  { "region.ldong_regn_cd": "26" } },
        {
          // 체중 제한이 없거나(= 제한 없음/불명), 상한이 13 이상인 곳만 후보로.
          // 상한이 정확히 13 이고 weight_op=lt(미만)인 곳은 여기서 통과하므로 앱이 걸러낸다.
          "bool": { "should": [
            { "bool": { "must_not": { "exists": { "field": "pet_tags.weight_limit_kg" } } } },
            { "range": { "pet_tags.weight_limit_kg": { "gte": 13 } } }
          ]}
        }
      ],
      "must_not": [
        { "term": { "pet_tags.pet_allowed": false } }                              // §0-0
        // 사용자의 반려견이 맹견일 때만 추가:
        // { "term": { "pet_tags.breed_excluded": "맹견" } }
      ]
    }
  },
  "highlight": {                       // 판정 근거 하이라이트
    "fields": {
      "pet_raw.possible_pet": {},
      "pet_raw.need_matter": {},
      "pet_raw.etc_info": {}
    },
    // ★ 필수. 이게 없으면 highlight 가 통째로 빈 값으로 나온다 (아래 주의 참조)
    "highlight_query": {
      "bool": { "should": [
        { "match": { "pet_raw.possible_pet": "동반 가능 견종" } },
        { "match": { "pet_raw.need_matter":  "목줄 이동장 입마개 매너벨트" } },
        { "match": { "pet_raw.etc_info":     "배변봉투 목줄 입마개" } }
      ]}
    }
  }
}
```

> ⚠️ **`breed_excluded` 필터는 조건부로만 건다.** `breed_excluded: 맹견` 은 "맹견은 못 들어온다"는 뜻이다.
> 이걸 무조건 `must_not` 에 넣으면 소형견 보호자에게서도 해당 시설(대부분 일반 공원·관광지)이 사라진다.
> 이 문서의 이전 판 예시가 이 실수를 하고 있었다.

> ⚠️ **`highlight_query` 없이는 highlight 가 동작하지 않는다 (2026-08-24 실측)**
>
> `filter` 절은 **점수를 매기지 않으므로 강조할 매칭 자체가 없고**, ES 는 `highlight` 를 요청받아도 빈 결과를 준다.
> 실제로 부산 39건을 조회했을 때 highlight 가 붙은 문서는 **0건**이었다.
>
> | 상황 | 방법 |
> |---|---|
> | 사용자 검색어 **없이** 조건만으로 목록을 낼 때 | 위처럼 **`highlight_query`** 로 근거 어휘를 직접 지정 |
> | 사용자 검색어가 **있을 때** | 그 검색어를 `must`(`multi_match`)로 넣으면 highlight 가 자동으로 붙는다 |
>
> 실측 결과:
> ```
> 광안리해수욕장 · need_matter : <em>목줄</em> 착용
> 광안리해수욕장 · etc_info    : - 맹견의 경우, <em>입마개</em> 착용 필수- <em>배변봉투</em> 지참 및 배변처리 필수
> 송도해상케이블카 · need_matter: <em>이동장</em>(<em>켄넬</em>)사용
> ```
>
> `전 견종` 이 `<em>견</em><em>종</em>` 으로 쪼개져 강조되는 현상이 있다 — nori 복합어 분해 때문이다.

### 내 주변 반경 검색

```jsonc
{ "query": { "bool": {
    "filter": [
      { "term": { "sync.is_active": true } },
      { "geo_distance": { "distance": "5km", "location": { "lat": 35.18, "lon": 129.22 } } },
      { "term": { "pet_tags.area_scope": "all" } }
    ],
    "must_not": [ { "term": { "pet_tags.pet_allowed": false } } ]
  }},
  "sort": [ { "_geo_distance": { "location": { "lat": 35.18, "lon": 129.22 }, "order": "asc", "unit": "km" } } ] }
```

좌표가 한반도 범위 밖이거나 비어 있는 원본은 `location` 을 버린다 — 반경 검색에서는 자연히 빠진다.

### 신뢰도 가중 정렬

```jsonc
{ "query": { "function_score": {
    "query": { "bool": {
      "must":   [ { "match_all": {} } ],        // ★ 검색어 없을 때. 있으면 multi_match 로 교체 (§0-3)
      "filter": [ /* 위 조건 필터 */ ]
    }},
    "functions": [
      { "field_value_factor": { "field": "pet_tags.confidence_score", "missing": 0.2 } },
      { "gauss": { "sync.modified_at": { "origin": "now", "scale": "180d", "decay": 0.5 } } },
      { "filter": { "term": { "report.warning": true } }, "weight": 0.5 }   // 제보 경고 시 하향
    ],
    "score_mode": "multiply", "boost_mode": "multiply"
}}}
```

세 가지가 곱해져 **"조건이 명확하고, 최근에 갱신됐고, 규정 변경 제보가 없는 시설"** 이 위로 올라온다.

> ⚠️ **`boost_mode` 주의 (2026-08-24 실측)**
>
> `replace` 는 검색어 관련도(BM25)를 통째로 버린다. `multiply` 로만 바꾸면 검색어가 없을 때 `filter` 만 남아
> base score 가 0 이 되고 **모든 문서의 score 가 0** 이 된다(실측: MVP 1,047건 전부 `score=0.0`).
> → `multiply` + 검색어가 없으면 `match_all` 을 깔아 base score 를 1.0 으로 만든다.
>
> | 케이스 | 수정 전 | 수정 후 |
> |---|---|---|
> | 검색어 없음 | `score=0.0` | `score=0.9996` |
> | `q=공원` + 부산 | 관련도 무시됨 | `score=11.46` (BM25×신뢰도) |

### 상세 화면에서 쓸 `sync.*`

| 필드 | 용도 |
|---|---|
| `sync.modified_at` | 관광공사 원본 수정일. 신선도 정렬 기준 |
| `sync.intro_fetched_at` | `intro` 를 마지막으로 **받은** 시각 — "운영시간 최종 확인" 표기용 |
| `sync.intro_checked_at` | 마지막으로 재조회를 **시도한** 시각 — 배치 커서. 표시에 쓰지 말 것 |
| `sync.is_active` / `inactive_reason` / `deactivated_at` | §2 ④ |

운영시간·휴무일 실시간 재조회는 NestJS 몫이다(`docs/검색-API-스펙.md` §3.1). 배치의 7일 TTL 재조회는
아무도 열어보지 않은 시설을 위한 백스톱이라 계속 돈다.

---

## 5. 벡터 검색 (선택 · `EMBED_ENABLED=false` 기본 · 현재 0건)

### 청크 단위 임베딩

시설 1건을 벡터 1개로 만들면 제목 + 개요 + 시설목록 + 기타안내가 1,500자를 넘고 **임베딩이 평균화되어 의미가 흐려진다.**
해동용궁사 한 건만 봐도 창건 설화, 건물 구성, 주차장/화장실, 맹견 입마개 안내가 전혀 다른 이야기다.

→ **250자 내외 청크 단위로 임베딩한다**(`embed.build_chunks()`, 문장 경계 유지). 해동용궁사는 5개 청크가 된다:

```
[0] title     ( 19자) 해동용궁사 관광지 부산광역시 기장군
[1] overview  (181자) 해동용궁사는 1376년 공민왕의 왕사였던 나옹대사의 창건으로 …
[2] overview  (167자) 1974년 정암 스님이 이 절의 주지가 되어 관음도량으로 복원할 …
[3] facility  ( 13자) 주차장, 화장실, 개수대
[4] etc_info  ( 39자) - 맹견의 경우, 입마개 착용 필수 - 배변봉투 지참 및 배변처리 필수
```

### 별도 인덱스가 아니라 `nested` 로

조건 필터(`pet_tags.weight_limit_kg` 등)는 **시설 단위 속성**이다. 청크를 별도 인덱스에 두면 kNN 에 이 필터를 걸 수 없고
앱에서 사후 조인해야 한다. 그 사이에 **내 반려견이 못 들어가는 시설이 추천된다** — 이 서비스가 없애려는 헛걸음 그 자체다.

| | 별도 인덱스 | nested (채택) |
|---|---|---|
| 청크 입도 | ✅ | ✅ |
| 조건 필터 pre-filter | ❌ 앱에서 사후 조인 | ✅ 부모 필드로 자동 |
| 매칭 청크 식별 | 문서 자체 | `inner_hits` |

### 쓸 곳과 쓰면 안 되는 곳

| | |
|---|---|
| ✅ 자연어 탐색 | "물놀이 되는 조용한 곳" — BM25로는 불가능 |
| ✅ 유사 시설 추천 | |
| ❌ **조건 판정** | **"5kg 이하"와 "15kg 이하"는 임베딩 공간에서 거의 같은 벡터.** 수치 비교가 불가능하다 |

그래서 `build_chunks()` 는 **조건 수치가 든 필드(`possible_pet`, `need_matter`)를 의도적으로 제외**하고
제목·개요·시설·기타안내만 넣는다.

### 하이브리드 질의 — 조건 필터를 kNN 에도 반드시 건다

```jsonc
{
  "knn": {
    "field": "semantic.vector",          // nested 필드 — ES 가 부모 문서 단위로 묶어 반환
    "query_vector": [/* bge-m3(1024차원)로 임베딩한 사용자 질의 */],
    "k": 50, "num_candidates": 200,
    "filter": [                          // ★ 이게 없으면 못 들어가는 곳이 추천된다
      { "term": { "sync.is_active": true } },
      { "bool": { "must_not": { "term": { "pet_tags.pet_allowed": false } } } },
      { "bool": { "should": [
        { "bool": { "must_not": { "exists": { "field": "pet_tags.weight_limit_kg" } } } },
        { "range": { "pet_tags.weight_limit_kg": { "gte": 13 } } }
      ]}}
    ],
    "inner_hits": {                      // 어느 청크가 걸렸는지 = 추천 근거
      "size": 2,
      "_source": ["semantic.text", "semantic.source_field"]
    }
  },
  "query": { "multi_match": { "query": "물놀이 조용한", "fields": ["title^2","overview","pet_raw.facility"] } },
  "size": 20
}
```

> ✅ **실측 (2026-08-20, ES 8.15.3 · Basic)**
> 1. nested `dense_vector`(`int8_hnsw`) kNN + 부모 필드 pre-filter + `inner_hits` → **동작함**.
> 2. `retriever` + `rrf` → **403** (`current license is non-compliant for [Reciprocal Rank Fusion (RRF)]`).
>    → `knn` + `query` 점수 합산을 쓴다. BM25 는 상한이 없고 cosine 은 0~2 라 벡터 쪽이 묻히므로
>    필요하면 `knn.boost` 로 기여도를 맞추거나, NestJS 에서 두 질의를 따로 던져 `1/(k+rank)` 로 직접 융합한다.

벡터는 **Phase 2** 다. 쿼리마다 임베딩이 필요해 CPU 기준 100~500ms 가 추가되고, Ollama(bge-m3, ~2.5GB) 컨테이너가 떠 있어야 한다.

---

## 6. 인덱스 운영

| 항목 | 결정 | 이유 |
|---|---|---|
| 샤드 | **1** | 1만 건·35MB 규모. 과분할은 오히려 손해 |
| 레플리카 | 로컬 0 / 운영 1+ | |
| `refresh_interval` | 30s | 배치 색인이라 실시간성 불필요. 배치 직후 반영이 늦을 수 있다 |
| 보안 | 로컬은 `xpack.security.enabled=false` | **외부에 열면 인증 없이 읽고 쓰인다.** 운영 전환 미착수 |
| 날짜별 롤오버 | **안 함** | 이벤트 스트림이 아니라 마스터 카탈로그. 매일 새 인덱스면 같은 시설이 365벌 복제됨 |
| 과거 시점·장애 복구 | `data/raw/dt=*/*.jsonl` 원본 랜딩 | 2026-09-08 ES 를 통째로 잃었을 때 API 호출 0회로 전건 복구했다 |
| 매핑 변경 | `scripts/reindex_place.py` — `-v(n+1)` 생성 → `_reindex` → 별칭 원자 교체 | 무중단 · `_source` 보존 |
| 태깅 규칙 변경 | `run.py retag` — ES 의 `pet_raw` 로 재추출 | API 재호출 불필요. `TAGGER_VERSION` 을 올리고 통보 |
| 동의어 사전(`pet_synonyms.txt`) 변경 | 이미지 재빌드 → 컨테이너 재시작 → `_reload_search_analyzers` | 검색 분석기 전용 + `updateable:true` 라 **재색인 불필요** |
| 사용자 사전(`pet_user_dict.txt`) 변경 | 이미지 재빌드 → **재색인** | 토크나이저라 색인 분석기에도 걸린다. reload 로는 안 바뀐다 |

### `report.*` 와 재색인

`report.*` 는 NestJS 가 쓰고 배치는 절대 건드리지 않는다. 소스 오브 트루스는 Postgres 다.

- `_reindex` 는 `_source` 를 복사하므로 **`report.*` 가 보존된다.**
- `setup-es --force` 는 인덱스를 지우고 새로 만들므로 **`report.*` 가 사라진다** — 평상시 쓰지 않는다.
  사라져도 Postgres 에서 다시 역류시키면 된다(`docs/erd-설계.md` §4). "ES 는 언제든 버리고 다시 만들 수 있다"가 이 구조의 전제다.

---

## 7. 변경 이력 (NestJS 에 영향 있는 것만)

| 날짜 | 변경 | NestJS 영향 |
|---|---|---|
| 2026-08-24 | 최종 판정 소유권 → NestJS | 판정 로직은 `pet_tags` 를 읽어 앱에서 구현 |
| v1.1.0 | `pet_tags.pet_allowed: false` 추가 | 모든 검색에 `must_not` (§0-0), 상세에서 `denied` 확정 |
| v1.2.0 | `muzzle_required` 에서 `muzzle_required_for_dangerous` 분리 | 준비물 체크리스트는 `muzzle_required` 만 보고, 조건부는 맹견 보호자에게만 |
| 2026-09-08 | `info` / `info_count` 추가 (`detailInfo2`) | 상세 화면 표시용. 숙박은 객실 목록 |
| 2026-09-08 | `sync.intro_fetched_at` / `intro_checked_at` 분리 | 화면 표기는 `intro_fetched_at` |
| 2026-09-08 | `sync.listed_at` · `inactive_reason` · `deactivated_at` | 목록 미등재로 비활성된 건만 사유가 찍힌다 (§2 ④) |
| — | 이전 판 §3 예시의 무조건 `breed_excluded` 제외 수정 | 같은 쿼리를 복사해 썼다면 확인 필요 (§4) |
