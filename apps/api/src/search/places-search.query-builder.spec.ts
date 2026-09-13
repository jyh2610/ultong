import type { estypes } from '@elastic/elasticsearch';
import { buildPlacesSearchQuery } from './places-search.query-builder';
import { PlacesSearchQueryDto } from './dto/places-search-query.dto';

function baseDto(
  overrides: Partial<PlacesSearchQueryDto> = {},
): PlacesSearchQueryDto {
  const dto = new PlacesSearchQueryDto();
  Object.assign(dto, overrides);
  return dto;
}

interface BoolClause {
  filter: Record<string, unknown>[];
  must: Record<string, unknown>[];
  must_not: Record<string, unknown>[];
}

function getBool(request: estypes.SearchRequest): BoolClause {
  const query = request.query as {
    function_score: { query: { bool: BoolClause } };
  };
  return query.function_score.query.bool;
}

describe('buildPlacesSearchQuery', () => {
  it('always filters sync.is_active and always excludes pet_allowed=false', () => {
    const request = buildPlacesSearchQuery(baseDto());

    const bool = getBool(request);

    expect(bool.filter).toContainEqual({ term: { 'sync.is_active': true } });
    expect(bool.must_not).toContainEqual({
      term: { 'pet_tags.pet_allowed': false },
    });
  });

  it('filters to the MVP 5 content types by default', () => {
    const request = buildPlacesSearchQuery(baseDto());
    const bool = getBool(request);

    expect(bool.filter).toContainEqual({
      terms: { 'category.content_type_id': ['12', '14', '28', '32', '39'] },
    });
  });

  it('uses match_all when q is absent (rule 3)', () => {
    const request = buildPlacesSearchQuery(baseDto());
    const bool = getBool(request);

    expect(bool.must).toEqual([{ match_all: {} }]);
  });

  it('uses multi_match on the specified fields when q is present', () => {
    const request = buildPlacesSearchQuery(baseDto({ q: '공원' }));
    const bool = getBool(request);

    expect(bool.must).toEqual([
      {
        multi_match: {
          query: '공원',
          fields: [
            'title^3',
            'overview',
            'addr1',
            'pet_raw.possible_pet',
            'pet_raw.need_matter',
            'pet_raw.etc_info',
          ],
          type: 'best_fields',
        },
      },
    ]);
  });

  it('adds ldongRegnCd, ldongSignguCd, and lcls1/2/3 filters only when present', () => {
    const request = buildPlacesSearchQuery(
      baseDto({
        ldongRegnCd: '26',
        ldongSignguCd: '26410',
        lcls1: 'NA',
        lcls2: 'NA01',
        lcls3: 'NA0101',
      }),
    );
    const bool = getBool(request);

    expect(bool.filter).toContainEqual({
      term: { 'region.ldong_regn_cd': '26' },
    });
    expect(bool.filter).toContainEqual({
      term: { 'region.ldong_signgu_cd': '26410' },
    });
    expect(bool.filter).toContainEqual({ term: { 'category.lcls1': 'NA' } });
    expect(bool.filter).toContainEqual({ term: { 'category.lcls2': 'NA01' } });
    expect(bool.filter).toContainEqual({
      term: { 'category.lcls3': 'NA0101' },
    });
  });

  it('adds a geo_distance filter only when lat, lon, and radiusKm are all present', () => {
    const withGeo = buildPlacesSearchQuery(
      baseDto({ lat: 35.16, lon: 129.16, radiusKm: 5 }),
    );
    const boolWithGeo = getBool(withGeo);
    expect(boolWithGeo.filter).toContainEqual({
      geo_distance: { distance: '5km', location: { lat: 35.16, lon: 129.16 } },
    });

    const withoutGeo = buildPlacesSearchQuery(baseDto({ lat: 35.16 }));
    const boolWithoutGeo = getBool(withoutGeo);
    expect(
      boolWithoutGeo.filter.some(
        (clause: Record<string, unknown>) => 'geo_distance' in clause,
      ),
    ).toBe(false);
  });

  it('adds a weight candidate-narrowing filter (missing OR >= weightKg) when weightKg is given', () => {
    const request = buildPlacesSearchQuery(baseDto({ weightKg: 13 }));
    const bool = getBool(request);

    expect(bool.filter).toContainEqual({
      bool: {
        should: [
          {
            bool: {
              must_not: { exists: { field: 'pet_tags.weight_limit_kg' } },
            },
          },
          { range: { 'pet_tags.weight_limit_kg': { gte: 13 } } },
        ],
      },
    });
  });

  it('adds a breed_excluded=맹견 must_not only when excludeDangerous is true', () => {
    const excluded = buildPlacesSearchQuery(
      baseDto({ excludeDangerous: true }),
    );
    const boolExcluded = getBool(excluded);
    expect(boolExcluded.must_not).toContainEqual({
      terms: { 'pet_tags.breed_excluded': ['맹견'] },
    });

    const notExcluded = buildPlacesSearchQuery(baseDto());
    const boolNotExcluded = getBool(notExcluded);
    expect(boolNotExcluded.must_not).toHaveLength(1);
  });

  it('always includes the fixed highlight_query (rule 2)', () => {
    const request = buildPlacesSearchQuery(baseDto());

    expect(request.highlight).toEqual({
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
    });
  });

  it('includes the five aggregations', () => {
    const request = buildPlacesSearchQuery(baseDto());

    expect(request.aggs).toEqual({
      by_lcls1: { terms: { field: 'category.lcls1', size: 15 } },
      by_type: { terms: { field: 'category.content_type_id', size: 10 } },
      by_sido: { terms: { field: 'region.ldong_regn_cd', size: 20 } },
      by_confidence: { terms: { field: 'pet_tags.confidence', size: 5 } },
      by_area_scope: { terms: { field: 'pet_tags.area_scope', size: 5 } },
    });
  });

  it('uses multiply score_mode and boost_mode (not replace)', () => {
    const request = buildPlacesSearchQuery(baseDto());
    const fs = (request.query as { function_score: Record<string, unknown> })
      .function_score;

    expect(fs.score_mode).toBe('multiply');
    expect(fs.boost_mode).toBe('multiply');
  });

  it('paginates via from/size computed from page and size', () => {
    const request = buildPlacesSearchQuery(baseDto({ page: 3, size: 10 }));

    expect(request.from).toBe(20);
    expect(request.size).toBe(10);
  });

  it('sorts by _geo_distance when sort=distance and lat/lon are present', () => {
    const request = buildPlacesSearchQuery(
      baseDto({ sort: 'distance', lat: 35.16, lon: 129.16 }),
    );

    expect(request.sort).toEqual([
      {
        _geo_distance: {
          location: { lat: 35.16, lon: 129.16 },
          order: 'asc',
          unit: 'km',
        },
      },
    ]);
  });

  it('sorts by sync.modified_at desc when sort=recent', () => {
    const request = buildPlacesSearchQuery(baseDto({ sort: 'recent' }));

    expect(request.sort).toEqual([{ 'sync.modified_at': 'desc' }]);
  });

  it('leaves sort unset for the default relevance sort', () => {
    const request = buildPlacesSearchQuery(baseDto());

    expect(request.sort).toBeUndefined();
  });
});
