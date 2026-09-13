import { PlacesService } from './places.service';
import { EsClientService } from './es-client.service';
import { CodesService } from './codes.service';
import { PlacesSearchQueryDto } from './dto/places-search-query.dto';

describe('PlacesService', () => {
  let service: PlacesService;
  const search = jest.fn();
  const esClient = { client: { search } };
  const codesService = {
    getCategories: jest.fn(),
    getRegions: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    codesService.getCategories.mockResolvedValue([
      {
        code: 'VE',
        name: '문화관광',
        parentCode: null,
        parentName: null,
        depth: 1,
        path: '문화관광',
      },
      {
        code: 'VE03',
        name: '도시공원',
        parentCode: 'VE',
        parentName: '문화관광',
        depth: 2,
        path: '문화관광 > 도시공원',
      },
    ]);
    codesService.getRegions.mockResolvedValue([
      {
        code: '26',
        name: '부산광역시',
        parentCode: null,
        parentName: null,
        depth: 1,
        path: '부산광역시',
      },
      {
        code: '26410',
        name: '서구',
        parentCode: '26',
        parentName: '부산광역시',
        depth: 2,
        path: '부산광역시 > 서구',
      },
    ]);

    service = new PlacesService(
      esClient as unknown as EsClientService,
      codesService as unknown as CodesService,
    );
  });

  function baseDto(
    overrides: Partial<PlacesSearchQueryDto> = {},
  ): PlacesSearchQueryDto {
    const dto = new PlacesSearchQueryDto();
    Object.assign(dto, overrides);
    return dto;
  }

  function esResponse(overrides: Record<string, unknown> = {}) {
    return {
      hits: {
        total: { value: 1 },
        hits: [
          {
            _id: '126508',
            _source: {
              title: '부산 암남공원',
              addr1: '부산광역시 서구 암남공원로 185',
              location: { lat: 35.07, lon: 129.01 },
              media: { thumb: 'https://tong.visitkorea.or.kr/thumb.jpg' },
              category: {
                content_type_id: '12',
                lcls1: 'VE',
                lcls2: 'VE03',
                lcls3: 'VE030100',
              },
              region: {
                ldong_regn_cd: '26',
                ldong_signgu_cd: '140',
                sido: '부산광역시',
                sigungu: '서구',
              },
              pet_tags: {
                weight_limit_kg: 15,
                weight_op: 'lte',
                confidence: 'certain',
              },
              pet_evidence: [{ field: 'acmpyNeedMtr', matched: '목줄 착용' }],
            },
            highlight: { 'pet_raw.need_matter': ['<em>목줄</em> 착용'] },
          },
        ],
      },
      aggregations: {
        by_lcls1: { buckets: [{ key: 'VE', doc_count: 6 }] },
        by_type: { buckets: [{ key: '12', doc_count: 8 }] },
        by_sido: { buckets: [{ key: '26', doc_count: 12 }] },
        by_confidence: {
          buckets: [
            { key: 'certain', doc_count: 11 },
            { key: 'estimated', doc_count: 1 },
          ],
        },
      },
      ...overrides,
    };
  }

  it('maps a hit into a response item with code-joined category/region names', async () => {
    search.mockResolvedValue(esResponse());

    const result = await service.search(
      baseDto({ weightKg: 13, hasCage: false }),
    );

    expect(result.items[0]).toMatchObject({
      contentId: '126508',
      title: '부산 암남공원',
      addr1: '부산광역시 서구 암남공원로 185',
      location: { lat: 35.07, lon: 129.01 },
      thumb: 'https://tong.visitkorea.or.kr/thumb.jpg',
      category: {
        contentTypeId: '12',
        contentType: '관광지',
        lcls1: 'VE',
        lcls2: 'VE03',
        lcls3: 'VE030100',
        categoryPath: '문화관광 > 도시공원',
      },
      region: { sido: '부산광역시', sigungu: '서구' },
      evidence: [{ field: 'acmpyNeedMtr', matched: '목줄 착용' }],
      highlight: { 'pet_raw.need_matter': ['<em>목줄</em> 착용'] },
    });
  });

  it('computes match via matchVerdict using the request weightKg/hasCage', async () => {
    search.mockResolvedValue(esResponse());

    const result = await service.search(
      baseDto({ weightKg: 13, hasCage: false }),
    );

    expect(result.items[0].match).toEqual({
      verdict: 'allowed',
      confidence: 'certain',
      areaRestricted: false,
      reasons: ['체중 13kg ≤ 15kg 충족'],
    });
  });

  it('falls back to lcls1-level category lookup when lcls3 has no code entry', async () => {
    search.mockResolvedValue(
      esResponse({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: '1',
              _source: {
                title: 'x',
                category: {
                  content_type_id: '12',
                  lcls1: 'VE',
                  lcls3: 'UNKNOWN_CODE',
                },
                region: {},
                pet_tags: {},
              },
            },
          ],
        },
      }),
    );

    const result = await service.search(baseDto());

    expect(result.items[0].category.categoryPath).toBe('문화관광');
  });

  it('falls back to the sido code lookup only when region.sido is absent, and never guesses sigungu by code alone (ldong_signgu_cd is only unique within its sido)', async () => {
    search.mockResolvedValue(
      esResponse({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: '1',
              _source: {
                title: 'x',
                category: {},
                region: { ldong_regn_cd: '26', ldong_signgu_cd: '140' },
                pet_tags: {},
              },
            },
          ],
        },
      }),
    );

    const result = await service.search(baseDto());

    expect(result.items[0].region).toEqual({
      sido: '부산광역시',
      sigungu: null,
    });
  });

  it('includes distanceKm from hit.sort only when sort=distance', async () => {
    search.mockResolvedValue({
      ...esResponse(),
      hits: {
        total: { value: 1 },
        hits: [{ ...esResponse().hits.hits[0], sort: [4.21] }],
      },
    });

    const withDistance = await service.search(
      baseDto({ sort: 'distance', lat: 35.07, lon: 129.01 }),
    );
    expect(withDistance.items[0].distanceKm).toBe(4.21);

    search.mockResolvedValue(esResponse());
    const withoutDistance = await service.search(baseDto());
    expect(withoutDistance.items[0].distanceKm).toBeUndefined();
  });

  it('builds facets: byCategory/byType/bySido with resolved names, byConfidence without names', async () => {
    search.mockResolvedValue(esResponse());

    const result = await service.search(baseDto());

    expect(result.facets).toEqual({
      byCategory: [{ code: 'VE', name: '문화관광', count: 6 }],
      byType: [{ code: '12', name: '관광지', count: 8 }],
      bySido: [{ code: '26', name: '부산광역시', count: 12 }],
      byConfidence: [
        { code: 'certain', count: 11 },
        { code: 'estimated', count: 1 },
      ],
    });
  });

  it('returns total/page/size from the request and response', async () => {
    search.mockResolvedValue(
      esResponse({ hits: { total: { value: 42 }, hits: [] } }),
    );

    const result = await service.search(baseDto({ page: 2, size: 10 }));

    expect(result.total).toBe(42);
    expect(result.page).toBe(2);
    expect(result.size).toBe(10);
  });
});
