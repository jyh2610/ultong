# 검색 API 스펙 (NestJS ↔ Elasticsearch)

**대상**: NestJS API 서버 담당자
**전제**: 팀 경계면은 Elasticsearch 인덱스다. Python 배치가 `pettour-place` / `pettour-code` 를 채우고,
NestJS 가 그것을 읽어 REST 로 노출한다. Python 쪽에 API 서버는 없다(FastAPI 이중화 없음).

· 아래 쿼리는 전부 실데이터(활성 9,694건 / MVP 5종 1,047건)로 실행 검증했다.

---

## 0. 먼저 — 반드시 지켜야 할 5가지

이걸 놓치면 조용히 잘못된 결과가 나간다. 다섯 다 실측으로 확인된 함정이다.

| # | 규칙 | 안 지키면 |
|---|---|---|
| 0 | 모든 검색에 **`must_not: pet_tags.pet_allowed = false`** (2026-09-08 추가) | 반려동물 **동반 불가 17건**(숙박 15건)이 '확인 필요'로 노출된다. 상세 매칭에서도 `denied` 로 확정할 것 |
| 1 | 모든 검색에 **`sync.is_active: true`** 필터 | 폐업·종료된 **461건**(2026-09-08 실측)이 검색 결과에 그대로 노출된다 |
| 2 | `highlight` 에 **`highlight_query` 필수** | 근거 하이라이트가 **전부 빈 값**으로 나온다 (기획서 §7.2② 기능이 죽음) |
| 3 | 검색어 없을 때 **`must: [{match_all:{}}]`** 를 깔 것 | `function_score` 의 신뢰도 가중이 **전부 score 0** 이 되어 무력화된다 |
| 4 | **RRF 쓰지 말 것** | Basic 라이선스에서 `403`. 하이브리드는 `knn`+`query` 점수 합산으로 |

---

## 1. 엔드포인트 목록

| 메서드 | 경로 | 용도 |
|---|---|---|
| `GET` | `/places/search` | 조건 매칭 검색 (검색어·지역·분류·반경·반려견 조건) |
| `GET` | `/places/:contentId` | 시설 상세 |
| `GET` | `/codes/categories` | 카테고리 탭 재료 (분류체계) |
| `GET` | `/codes/regions` | 지역 필터 재료 (법정동) |

---

## 2. `GET /places/search`

### 요청 파라미터

| 이름 | 타입 | 설명 |
|---|---|---|
| `q` | string | 검색어. `title^3`, `overview`, `addr1`, `pet_raw.*` 대상 |
| `contentTypeId` | string[] | `12`관광지 `14`문화시설 `28`레포츠 `32`숙박 `39`음식점. 기본 이 5종 |
| `lcls1` `lcls2` `lcls3` | string | 분류체계. 예: `lcls1=NA`(자연관광) |
| `ldongRegnCd` `ldongSignguCd` | string | 법정동 시도·시군구 |
| `lat` `lon` `radiusKm` | number | 반경 검색 |
| `weightKg` | number | 반려견 체중. **후보 축소용** — 최종 판정은 §4 |
| `hasCage` | boolean | 이동장 소지 여부. ES 에는 안 쓰고 §4 판정에만 |
| `excludeDangerous` | boolean | 맹견 제외 시설 걸러내기 |
| `sort` | enum | `relevance`(기본) · `distance` · `recent` |
| `page` `size` | number | 기본 1 / 20 |

> `contentTypeId` 기본값을 MVP 5종으로 두는 이유: 쇼핑(38)이 활성 8,647건인데
> 대부분 "가까운약국" 같은 동네 상점이고 태깅 신뢰도가 '확실 0%' 다. 지도 보조 레이어로만 쓴다.

### ES 쿼리

```jsonc
POST pettour-place/_search
{
  "from": 0, "size": 20,
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "filter": [
            { "term": { "sync.is_active": true } },            // ★ 규칙 1
            { "terms": { "category.content_type_id": ["12","14","28","32","39"] } },
            { "term": { "region.ldong_regn_cd": "26" } },      // ldongRegnCd 있을 때
            { "term": { "category.lcls1": "NA" } },            // lcls1 있을 때
            { "geo_distance": {                                // lat/lon/radiusKm 있을 때
                "distance": "5km", "location": { "lat": 35.16, "lon": 129.16 } } },
            { "bool": { "should": [                            // weightKg 있을 때
                { "bool": { "must_not": { "exists": { "field": "pet_tags.weight_limit_kg" } } } },
                { "range": { "pet_tags.weight_limit_kg": { "gte": 13 } } }
            ]}}
          ],
          // q 가 있으면 multi_match, 없으면 match_all  ← ★ 규칙 3
          "must": [
            { "multi_match": {
                "query": "공원",
                "fields": ["title^3","overview","addr1",
                           "pet_raw.possible_pet","pet_raw.need_matter","pet_raw.etc_info"],
                "type": "best_fields" } }
          ],
          "must_not": [                                        // excludeDangerous 일 때
            { "terms": { "pet_tags.breed_excluded": ["맹견"] } }
          ]
        }
      },
      "functions": [
        { "field_value_factor": { "field": "pet_tags.confidence_score", "missing": 0.2 } },
        { "gauss": { "sync.modified_at": { "origin": "now", "scale": "180d", "decay": 0.5 } } },
        { "filter": { "term": { "report.warning": true } }, "weight": 0.5 }
      ],
      "score_mode": "multiply",
      "boost_mode": "multiply"        // ★ replace 아님 — 아래 주의 참조
    }
  },
  "highlight": {                                                // ★ 규칙 2
    "fields": {
      "pet_raw.possible_pet": {}, "pet_raw.need_matter": {}, "pet_raw.etc_info": {}
    },
    "highlight_query": { "bool": { "should": [
      { "match": { "pet_raw.possible_pet": "동반 가능 견종 소형견 중형견 대형견" } },
      { "match": { "pet_raw.need_matter":  "목줄 이동장 켄넬 입마개 매너벨트 유모차" } },
      { "match": { "pet_raw.etc_info":     "배변봉투 목줄 입마개 예방접종 실내 실외" } }
    ]}}
  },
  "aggs": {
    "by_lcls1":      { "terms": { "field": "category.lcls1", "size": 15 } },
    "by_type":       { "terms": { "field": "category.content_type_id", "size": 10 } },
    "by_sido":       { "terms": { "field": "region.ldong_regn_cd", "size": 20 } },
    "by_confidence": { "terms": { "field": "pet_tags.confidence", "size": 5 } },
    "by_area_scope": { "terms": { "field": "pet_tags.area_scope", "size": 5 } }
  }
}
```

`sort=distance` 면 `"sort": [{"_geo_distance": {...,"order":"asc","unit":"km"}}]`,
`sort=recent` 면 `"sort": [{"sync.modified_at":"desc"}]` 를 붙인다.

> ### ⚠️ `boost_mode` 함정 (실측)
> `es-설계.md` §3 초안은 `boost_mode: "replace"` 였다. 그러면 **검색어 관련도(BM25)가 통째로 버려진다.**
> 반대로 `multiply` 로 바꾸면, 검색어가 없을 때 `filter` 만 남아 base score 가 0 이 되고
> **모든 문서 score 가 0** 이 된다(실측: A 케이스 1,047건 전부 `score=0.0`).
>
> → `multiply` + **검색어 없을 때 `match_all` 을 `must` 에 깔기**. 이러면 양쪽 다 산다.
>
> | 케이스 | 수정 전 | 수정 후 |
> |---|---|---|
> | 검색어 없음 (전체 목록) | `score=0.0` 전부 | `score=0.9996` (신뢰도×최신성) |
> | 검색어 '공원' + 부산 | 정상 | `score=11.46` (BM25×신뢰도) |

### 응답

```jsonc
{
  "total": 12,
  "page": 1, "size": 20,
  "items": [
    {
      "contentId": "126508",
      "title": "부산 암남공원",
      "addr1": "부산광역시 서구 암남공원로 185",
      "location": { "lat": 35.07, "lon": 129.01 },
      "thumb": "https://tong.visitkorea.or.kr/...",
      "category": {
        "contentTypeId": "12", "contentType": "관광지",
        "lcls1": "VE", "lcls2": "VE03", "lcls3": "VE030100",
        "categoryPath": "문화관광 > 도시공원 > 시민공원"   // ← /codes 조인 (§5)
      },
      "region": { "sido": "부산광역시", "sigungu": "서구" },
      "distanceKm": 4.21,                                   // sort=distance 일 때만
      "petTags": { /* _source.pet_tags 원본 그대로 */ },
      "match": {                                            // ← §4 에서 계산
        "verdict": "conditional",
        "areaRestricted": true,
        "confidence": "certain",
        "reasons": ["체중 13kg ≤ 15kg 충족", "일부 구역만 동반 가능 — 상세 구역은 원문 확인"]
      },
      "evidence": [                                         // _source.pet_evidence
        { "field": "acmpyNeedMtr", "rule": "equip:leash_required",
          "matched": "목줄 착용", "text": "목줄 착용" }
      ],
      "highlight": {                                        // ES highlight 결과
        "pet_raw.need_matter": ["<em>목줄</em> 착용"]
      }
    }
  ],
  "facets": {
    "byCategory":   [ { "code": "VE", "name": "문화관광", "count": 6 } ],
    "byType":       [ { "code": "12", "name": "관광지",   "count": 8 } ],
    "bySido":       [ { "code": "26", "name": "부산광역시", "count": 12 } ],
    "byConfidence": [ { "code": "certain", "count": 11 }, { "code": "estimated", "count": 1 } ]
  }
}
```

`match` 와 `evidence` 를 분리한 이유: `evidence` 는 **태깅 근거**(배치가 만든 것)이고
`highlight` 는 **검색 근거**(ES 가 만든 것)다. 화면에서 쓰임이 다르다.

---

## 3. `GET /places/:contentId`

`GET pettour-place/_doc/{contentId}` 로 `_source` 를 그대로 내리면 된다 (`_id = contentid`).

`_source.intro` 에 운영시간·휴무일이 들어 있지만 **`intro` 는 매핑이 `enabled: false`** 다.
읽을 수는 있어도 **검색·필터·집계는 불가**하다. "운영 중인 곳만 보기" 같은 기능은 ES 로 못 한다.

### 3.1 운영시간·휴무일 실시간 재조회 (NestJS 구현)

기획서·사유서의 **"상세 화면 진입 시마다 실시간 재조회"** 는 이 화면에서 NestJS 가
`detailIntro2` 를 직접 호출하는 것을 말한다. **2026-09-08 결정으로 실시간 호출 방침은
유지하되, 아래 4가지를 반드시 함께 구현한다.** 넷 중 하나라도 빠지면 호출 한도에 닿는
순간 상세 화면이 통째로 죽는다.

| # | 규칙 | 왜 |
|---|---|---|
| 1 | **단시간 캐시** (권장 10~30분) — 같은 `contentId` 연속 조회는 1회로 합친다 | 목록 → 상세 → 뒤로 → 다시 상세 같은 왕복이 그대로 호출로 새어나간다 |
| 2 | **오퍼레이션별 호출 카운터** — `detailIntro2` 만 따로 센다 | 한도가 오퍼레이션당이라 전체 합계로 세면 못 막는다 |
| 3 | **한도 근접 시 ES `_source.intro` 폴백** | 배치가 이미 채워둔 값이 있다. 실패시키지 말고 내려앉을 것 |
| 4 | **화면에 최종 확인 시각 표기** | 폴백인지 실시간인지 사용자가 구분할 수 있어야 한다. 사유서에 적은 문구이기도 하다 |

```
GET /places/:contentId 처리 순서

  1. ES 에서 _doc 조회 (기본 정보 + pet_tags + pet_raw + intro 스냅샷)
  2. intro 실시간 갱신 시도
       캐시 히트           → 캐시 값 사용,        source="cache"
       카운터 여유 있음    → detailIntro2 호출,   source="live"   (성공 시 캐시에 저장)
       카운터 소진/호출실패 → ES 의 intro 사용,    source="synced"
  3. 응답에 { intro, intro_source, intro_checked_at } 를 함께 내린다
```

- `intro_checked_at` 은 ES 문서의 `sync.intro_checked_at` 이 아니라 **이번에 실제로 확인한
  시각**이다. `source="synced"` 일 때만 ES 값을 그대로 쓴다.
- `detailIntro2` 는 `contentTypeId` 를 함께 넘겨야 한다 (타입마다 응답 스키마가 다르다).
- 인증키는 포털 Encoding 키를 **쿼리스트링에 원문 그대로** 붙인다. HTTP 클라이언트의
  파라미터 직렬화에 맡기면 `%2B` 가 `%25 2B` 로 재인코딩돼 인증이 깨진다
  (Python 배치가 겪은 함정. `pettour/client.py` 참조).

**한도에 대해 알아야 할 것**: 개발계정은 **오퍼레이션당 1,000회/일**(KST 자정 리셋)이다.
운영계정의 트래픽 한도는 **매뉴얼에 언급이 없다** — "무제한"이라는 근거는 없다.
게다가 운영계정은 *"정상적인 서비스가 되고 있음이 확인된 후"* 승인되고 1~3일이 걸리므로,
심사·시연 시점에는 개발키일 가능성이 높다
(`2026-08-24-공식문서-대조검증.md` §8, `활용사유서.md` §수정 내역 3).

**배치 쪽 백스톱은 그대로 둔다.** `run.py refresh-intro` 가 TTL(기본 7일)을 넘긴 문서를
매일 조금씩 다시 받는다. 실시간 호출과 충돌하지 않는다 — 실시간은 *사람이 열어본* 시설을,
배치는 *아무도 안 열어본* 시설을 담당한다. 둘 다 없으면 운영시간이 영원히 굳는다.

---

## 4. ★ verdict 판정 로직 이관

> # 🚧 이 절은 2026-08-25 에 개정 예정입니다
>
> **2026-08-24 결정: `match()` 의 소유권을 NestJS(팀원) 로 넘긴다.**
>
> 아래 내용은 "Python 이 원본이고 NestJS 가 포팅본" 이라는 **옛 전제**로 쓰여 있다.
> 소유권이 넘어가면 이중 구현 자체가 없어지므로 **골든 픽스처도 필요 없어진다.**
> 대신 팀원이 의존하는 대상이 `pet_tags` 의 **어휘**가 되므로, 픽스처가 하던
> "어휘 고정" 역할을 **`pet_tags` 스키마 계약**이 대신해야 한다.
>
> | | 개정 전 (아래 내용) | 개정 후 |
> |---|---|---|
> | `match()` 소유 | Python (본인) | **NestJS (팀원)** |
> | 계약 수단 | 골든 픽스처 112개 단언 | **`pet_tags` 스키마 계약** |
> | Python 사본 | 소스 오브 트루스 | `scripts/` 측정 전용 (소스 오브 트루스 아님) |
>
> **그때까지 아래 TypeScript 코드와 골든 픽스처는 그대로 유효하다** — 로직 자체는
> 바뀌지 않고 소유권과 계약 수단만 바뀐다. 구현을 시작해도 되며, 검증된 코드다
> (112개 단언 통과). 배경은 `2026-08-24-작업정리.md` §5 참조.

### 왜 ES 가 아니라 앱에서 하는가

`weight_op`(이하/미만) 경계, '추정'일 때 강등, 케이지 미소지 처리 같은 규칙을 쿼리 DSL 로 표현하면
읽기도 어렵고 규칙이 바뀔 때 쿼리와 코드가 따로 논다.
**ES 는 후보를 좁히고(`weightKg` 필터), 최종 3단계 판정은 앱이 한다.**

### 문제 — 같은 로직이 두 언어에 생긴다

원본은 Python `pettour/tagging.py :: match()` 인데 검색 API 는 NestJS 다. **구현이 갈라지는 게 최대 위험이다.**

### 대책 — 골든 픽스처

`docs/contracts/match-golden.json` 에 **실데이터 28건 × 페르소나 4종 = 112개 단언**을 넣어뒀다.
`allowed`/`conditional`/`denied`/`unknown` 4개 verdict 와 7개 분기(체중 상한·제한없음·케이지 필수·
일부구역·추정·불명·맹견 제외)를 전부 덮는다.

```jsonc
{
  "source_of_truth": "pettour/tagging.py :: match()",
  "personas": [ { "id": "cocker_13kg_nocage", "weight_kg": 13, "has_cage": false }, ... ],
  "cases": [
    { "content_id": "...", "pet_tags": { ... },
      "expected": { "cocker_13kg_nocage": { "verdict": "conditional", "areaRestricted": true, ... } } }
  ]
}
```

**NestJS 의 `matchVerdict()` 는 이 파일의 모든 케이스를 통과해야 한다.**
`verdict` / `areaRestricted` / `confidence` 는 정확히 일치해야 하고, `reasons` 는 사람이 읽는 문구라
문자열 일치까지 요구하지 않는다.

태깅 규칙을 고치면 Python 쪽에서 재생성하고 커밋한다:
```
python scripts/export_match_golden.py
```

### 이식할 로직 (TypeScript)

```ts
type Verdict = 'allowed' | 'conditional' | 'denied' | 'unknown';

export function matchVerdict(
  t: Record<string, any>,
  user: { weightKg?: number | null; hasCage?: boolean },
) {
  const reasons: string[] = [];
  const confidence = t.confidence ?? 'unknown';
  const limit = t.weight_limit_kg ?? null;
  const op = t.weight_op ?? 'lte';
  const estimated = t.weight_is_estimated === true;
  const weightKg = user.weightKg ?? null;

  let verdict: Verdict = 'unknown';

  if (limit !== null && weightKg !== null) {
    const ok = op === 'lt' ? weightKg < limit : weightKg <= limit;
    if (!ok) {
      // ★ 조기 반환 — areaRestricted 는 false 로 고정한다 (아래 주의 참조)
      return {
        verdict: 'denied' as Verdict, confidence, areaRestricted: false,
        reasons: [`체중 ${weightKg}kg > ${estimated ? '추정' : '명시'} 기준 ${limit}kg ${op}`],
      };
    }
    reasons.push(`체중 ${weightKg}kg ≤ ${limit}kg 충족`);
    verdict = estimated ? 'conditional' : 'allowed';
  } else if (t.size_max === '제한없음') {
    reasons.push('견종·체중 제한 없음');
    verdict = 'allowed';
  } else if (limit === null && confidence === 'unknown') {
    return {
      verdict: 'unknown' as Verdict, confidence, areaRestricted: false,
      reasons: ['원문에 동반 조건 문구 없음 — 방문 전 확인 필요'],
    };
  } else {
    verdict = 'conditional';
  }

  if (t.cage_required && !user.hasCage) {
    reasons.push('이동장(켄넬) 필수 — 미소지 시 입장 불가');
    verdict = 'conditional';
  }
  if (confidence === 'estimated' && verdict === 'allowed') verdict = 'conditional';

  // '일부구역'은 전체의 절반이라 verdict 를 낮추면 조건부가 남발되어 변별력이 사라진다.
  // 등급은 유지하고 배지로만 표시한다.
  const areaRestricted = t.area_scope === 'partial';
  if (areaRestricted) reasons.push('일부 구역만 동반 가능 — 상세 구역은 원문 확인');

  return { verdict, reasons, confidence, areaRestricted };
}
```

> ### ⚠️ 조기 반환 경로의 `areaRestricted` 는 항상 `false`
>
> `denied` / `unknown` 은 **조기 반환**이라 뒤쪽 규칙(케이지·추정 강등·일부구역)이 적용되지 않는다.
> Python 원본이 이 두 경로에서 `area_restricted` 키를 아예 넣지 않기 때문이다.
> 골든 픽스처에 **실제로 이런 케이스가 6건 있다** — '마라도', '서울랜드' 등은 `area_scope=partial`
> 이면서 대형견 기준 `denied` 인데 기대값은 `areaRestricted: false` 다.
>
> 편의 헬퍼를 만들어 `areaRestricted` 를 한 곳에서 계산하면 여기서 **조용히 갈라진다**(실제로
> 이 문서 초안이 그 버그를 갖고 있었다). 조기 반환에서는 반드시 `false` 로 고정할 것.
>
> ※ "불가인데 일부구역 배지가 필요한가"는 따로 논의할 문제다. 바꾼다면 **Python 원본을 먼저 고치고
> 픽스처를 재생성**해야 하며, 양쪽을 따로 고치면 안 된다.

---

## 5. `GET /codes/*` — 탭·필터 재료

place 문서에는 **코드만** 들어 있다(`category.lcls1~3`, `region.ldong_*`).
이름표는 `pettour-code` 인덱스에 있다 (2026-08-24 기준 600건).

| code_type | depth 1 | depth 2 | depth 3 |
|---|---:|---:|---:|
| `lcls` | 10 대분류 | 59 중분류 | 246 소분류 |
| `ldong` | 16 시도 | 269 시군구 | — |

문서 필드: `code_type` `code` `name` `parent_code` `parent_name` `depth` **`path`**

`path` 는 조인 없이 그대로 표시용으로 쓸 수 있다:
```
VE030100 → "문화관광 > 도시공원 > 시민공원"
```

**활성 MVP 1,047건에 쓰인 코드는 전부 이름표가 있다** (소분류 113개·시군구 202개 포함, 누락 0 검증).

### 카테고리 탭 실제 분포

| 코드 | 이름 | 건수 |
|---|---|---:|
| `NA` | 자연관광 | 322 |
| `VE` | 문화관광 | 298 |
| `AC` | 숙박 | 140 |
| `HS` | 역사관광 | 85 |
| `EX` | 체험관광 | 81 |
| `FD` | 음식 | 72 |
| `LS` | 레저스포츠 | 49 |

> **"반려동물 산책 친화" 큐레이션은 `NA`(자연관광 322건) + `VE03`(도시공원 137건)** 이다.
> 기획서 초안이 이걸 `VE` 로 적어뒀는데 `VE` 는 **문화관광**이라 박물관·미술관이 섞인다. 주의.

---

## 6. 검증 결과 (2026-08-24, 실데이터)

| 케이스 | 결과 |
|---|---|
| A. MVP 5종 전체, 검색어 없음 | ✅ 1,047건 · `score=0.9996` (규칙 3 적용 후) |
| B. `q=공원` + 부산 | ✅ 12건 · `score=11.46` · 하이라이트 정상 |
| C. `lcls1=NA` + 32kg + 맹견제외 | ✅ 298건 |
| D. 해운대 5km, 거리순 | ✅ 17건 · 0.10km / 0.60km / 0.63km |
| facet 5종 | ✅ 전부 정상 |
| 골든 픽스처 | ✅ 28케이스 × 4페르소나, verdict 4종·분기 7종 전부 커버 |

---

## 7. 참고 수치 (발표·화면 문구용)

- MVP 5종 활성 **1,047건**, 그중 동반조건 보유 **1,040건 (99.3%)**
- 태깅 신뢰도: **확실 77.3% / 추정 21.2% / 확인필요 1.5%**
- 타입별 '확실': 관광지 90.5% · 문화시설 80.0% · 레포츠 62.8% · 숙박 38.7% · **음식점 13.9%**
- 페르소나별 '불가': 말티즈 4kg **0.3%** → 리트리버 32kg **12.6%**

> 발표에 **54.3%**(쇼핑 섞인 층화표본)나 **86.3%**(부분 백필) 를 쓰지 말 것. 확정치는 **77.3%** 다.

---

## 8. 관련 문서

| 문서 | 내용 |
|---|---|
| `es-설계.md` | 인덱스 매핑, 분석기, 벡터 설계 |
| `2026-08-24-공식문서-대조검증.md` | OpenAPI 공식 매뉴얼 대조 결과, `showflag`, 코드 테이블 |
| `2026-08-24-P2-복구및배치보강.md` | 태깅 확정 수치 산출 과정 |
| `contracts/match-golden.json` | verdict 판정 골든 픽스처 |
| `활용사유서.md` | data.go.kr 활용 사유서 전문. §3.1 과 문구가 대응한다 |
| `멍냥로드-ES-연동명세서.xlsx` | 이 문서를 표로 정리한 팀원 배포용 명세서. `scripts/export_spec_xlsx.py` 로 재생성 |
