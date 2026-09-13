import { PlaceDetailService } from './place-detail.service';
import { EsClientService } from './es-client.service';
import { IntroRefetchService } from './intro-refetch.service';
import { PlaceDetailQueryDto } from './dto/place-detail-query.dto';

describe('PlaceDetailService', () => {
  let service: PlaceDetailService;
  const get = jest.fn();
  const esClient = { client: { get } };
  const introRefetchService = { getIntro: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlaceDetailService(
      esClient as unknown as EsClientService,
      introRefetchService as unknown as IntroRefetchService,
    );
  });

  function dto(
    overrides: Partial<PlaceDetailQueryDto> = {},
  ): PlaceDetailQueryDto {
    const d = new PlaceDetailQueryDto();
    Object.assign(d, overrides);
    return d;
  }

  it('returns null when the ES document does not exist (404)', async () => {
    get.mockRejectedValue({ meta: { statusCode: 404 } });

    const result = await service.getDetail('missing-id', dto());

    expect(result).toBeNull();
  });

  it('re-throws non-404 errors from ES', async () => {
    const error = new Error('cluster unavailable');
    get.mockRejectedValue(error);

    await expect(service.getDetail('126508', dto())).rejects.toThrow(error);
  });

  it('merges the ES source, computes match, and calls introRefetchService with the ES intro as fallback', async () => {
    get.mockResolvedValue({
      _id: '126508',
      _source: {
        title: '부산 암남공원',
        category: { content_type_id: '12' },
        pet_tags: {
          weight_limit_kg: 15,
          weight_op: 'lte',
          confidence: 'certain',
        },
        intro: { usetime: 'from-es' },
      },
    });
    introRefetchService.getIntro.mockResolvedValue({
      intro: { usetime: 'live-value' },
      introSource: 'live',
      introCheckedAt: '2026-09-13T00:00:00.000Z',
    });

    const result = await service.getDetail(
      '126508',
      dto({ weightKg: 13, hasCage: false }),
    );

    expect(introRefetchService.getIntro).toHaveBeenCalledWith('126508', '12', {
      usetime: 'from-es',
    });
    expect(result).toMatchObject({
      contentId: '126508',
      title: '부산 암남공원',
      match: {
        verdict: 'allowed',
        confidence: 'certain',
        areaRestricted: false,
        reasons: ['체중 13kg ≤ 15kg 충족'],
      },
      intro: { usetime: 'live-value' },
      introSource: 'live',
      introCheckedAt: '2026-09-13T00:00:00.000Z',
    });
  });

  it('passes null as the intro fallback when the ES document has no intro', async () => {
    get.mockResolvedValue({
      _id: '126508',
      _source: { title: 'x', category: {}, pet_tags: {} },
    });
    introRefetchService.getIntro.mockResolvedValue({
      intro: null,
      introSource: 'synced',
      introCheckedAt: '2026-09-13T00:00:00.000Z',
    });

    await service.getDetail('126508', dto());

    expect(introRefetchService.getIntro).toHaveBeenCalledWith(
      '126508',
      null,
      null,
    );
  });

  it('does not leak the raw ES intro snapshot alongside the resolved intro', async () => {
    get.mockResolvedValue({
      _id: '126508',
      _source: {
        title: 'x',
        category: {},
        pet_tags: {},
        intro: { usetime: 'from-es' },
      },
    });
    introRefetchService.getIntro.mockResolvedValue({
      intro: { usetime: 'live-value' },
      introSource: 'live',
      introCheckedAt: '2026-09-13T00:00:00.000Z',
    });

    const result = (await service.getDetail('126508', dto())) as Record<
      string,
      unknown
    >;

    expect(result.intro).toEqual({ usetime: 'live-value' });
  });
});
