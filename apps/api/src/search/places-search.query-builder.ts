import type { estypes } from '@elastic/elasticsearch';
import { PlacesSearchQueryDto } from './dto/places-search-query.dto';

type SearchRequest = estypes.SearchRequest;

export function buildPlacesSearchQuery(
  dto: PlacesSearchQueryDto,
): SearchRequest {
  const filter: Record<string, unknown>[] = [
    { term: { 'sync.is_active': true } },
    { terms: { 'category.content_type_id': dto.contentTypeId } },
  ];

  if (dto.ldongRegnCd) {
    filter.push({ term: { 'region.ldong_regn_cd': dto.ldongRegnCd } });
  }
  if (dto.ldongSignguCd) {
    filter.push({ term: { 'region.ldong_signgu_cd': dto.ldongSignguCd } });
  }
  if (dto.lcls1) filter.push({ term: { 'category.lcls1': dto.lcls1 } });
  if (dto.lcls2) filter.push({ term: { 'category.lcls2': dto.lcls2 } });
  if (dto.lcls3) filter.push({ term: { 'category.lcls3': dto.lcls3 } });

  // [비활성화 2026-09-14] 위치정보사업자 신고 회피 — 클라이언트 이관
  // (docs/superpowers/specs/2026-09-14-location-client-side-design.md)
  // if (
  //   dto.lat !== undefined &&
  //   dto.lon !== undefined &&
  //   dto.radiusKm !== undefined
  // ) {
  //   filter.push({
  //     geo_distance: {
  //       distance: `${dto.radiusKm}km`,
  //       location: { lat: dto.lat, lon: dto.lon },
  //     },
  //   });
  // }

  if (dto.weightKg !== undefined) {
    filter.push({
      bool: {
        should: [
          {
            bool: {
              must_not: { exists: { field: 'pet_tags.weight_limit_kg' } },
            },
          },
          { range: { 'pet_tags.weight_limit_kg': { gte: dto.weightKg } } },
        ],
      },
    });
  }

  // ★ 규칙 0 — 모든 검색에서 동반 불가 시설은 항상 제외한다.
  const mustNot: Record<string, unknown>[] = [
    { term: { 'pet_tags.pet_allowed': false } },
  ];
  if (dto.excludeDangerous) {
    mustNot.push({ terms: { 'pet_tags.breed_excluded': ['맹견'] } });
  }

  // ★ 규칙 3 — 검색어가 없으면 match_all을 깔아야 function_score가 무력화되지 않는다.
  const must = dto.q
    ? [
        {
          multi_match: {
            query: dto.q,
            fields: [
              'title^3',
              'overview',
              'addr1',
              'pet_raw.possible_pet',
              'pet_raw.need_matter',
              'pet_raw.etc_info',
            ],
            type: 'best_fields' as const,
          },
        },
      ]
    : [{ match_all: {} }];

  const request: SearchRequest = {
    index: 'pettour-place',
    from: (dto.page - 1) * dto.size,
    size: dto.size,
    query: {
      function_score: {
        query: { bool: { filter, must, must_not: mustNot } },
        functions: [
          {
            field_value_factor: {
              field: 'pet_tags.confidence_score',
              missing: 0.2,
            },
          },
          {
            gauss: {
              'sync.modified_at': { origin: 'now', scale: '180d', decay: 0.5 },
            },
          },
          { filter: { term: { 'report.warning': true } }, weight: 0.5 },
        ],
        // ★ multiply가 아니면(replace) 검색어 관련도(BM25)가 버려지고, must에 match_all이
        // 없으면(규칙 3) 검색어 없는 요청은 base score가 0이 되어 신뢰도 가중이 무력화된다.
        score_mode: 'multiply',
        boost_mode: 'multiply',
      },
    },
    // ★ 규칙 2 — highlight_query가 없으면 filter 전용 쿼리에서 하이라이트가 전부 빈 값이 된다.
    highlight: {
      fields: {
        'pet_raw.possible_pet': {},
        'pet_raw.need_matter': {},
        'pet_raw.etc_info': {},
      },
      highlight_query: {
        bool: {
          should: [
            {
              match: {
                'pet_raw.possible_pet': '동반 가능 견종 소형견 중형견 대형견',
              },
            },
            {
              match: {
                'pet_raw.need_matter':
                  '목줄 이동장 켄넬 입마개 매너벨트 유모차',
              },
            },
            {
              match: {
                'pet_raw.etc_info': '배변봉투 목줄 입마개 예방접종 실내 실외',
              },
            },
          ],
        },
      },
    },
    aggs: {
      by_lcls1: { terms: { field: 'category.lcls1', size: 15 } },
      by_type: { terms: { field: 'category.content_type_id', size: 10 } },
      by_sido: { terms: { field: 'region.ldong_regn_cd', size: 20 } },
      by_confidence: { terms: { field: 'pet_tags.confidence', size: 5 } },
      by_area_scope: { terms: { field: 'pet_tags.area_scope', size: 5 } },
    },
  };

  // [비활성화 2026-09-14] 위치정보사업자 신고 회피 — 클라이언트 이관
  // (docs/superpowers/specs/2026-09-14-location-client-side-design.md)
  // if (
  //   dto.sort === 'distance' &&
  //   dto.lat !== undefined &&
  //   dto.lon !== undefined
  // ) {
  //   request.sort = [
  //     {
  //       _geo_distance: {
  //         location: { lat: dto.lat, lon: dto.lon },
  //         order: 'asc',
  //         unit: 'km',
  //       },
  //     },
  //   ];
  // } else
  if (dto.sort === 'recent') {
    request.sort = [{ 'sync.modified_at': 'desc' }];
  }

  return request;
}
