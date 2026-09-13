import { ConfigService } from '@nestjs/config';
import { IntroRefetchService } from './intro-refetch.service';

describe('IntroRefetchService', () => {
  let config: { get: jest.Mock; getOrThrow: jest.Mock };
  let service: IntroRefetchService;

  beforeEach(() => {
    jest.restoreAllMocks();
    config = {
      get: jest.fn((key: string) => {
        if (key === 'TOUR_API_INTRO_CACHE_TTL_MIN') return '20';
        if (key === 'TOUR_API_DAILY_LIMIT') return '2';
        return undefined;
      }),
      getOrThrow: jest.fn().mockReturnValue('test-service-key'),
    };
    service = new IntroRefetchService(config as unknown as ConfigService);
    jest.useFakeTimers().setSystemTime(new Date('2026-09-13T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function mockFetchOnce(body: unknown, ok = true) {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok, json: () => Promise.resolve(body) } as Response);
  }

  const successBody = {
    response: {
      header: { resultCode: '0000' },
      body: { items: { item: [{ restdate: '', usetime: '09:00-18:00' }] } },
    },
  };

  it('calls TourAPI and returns source=live on a successful first fetch', async () => {
    mockFetchOnce(successBody);

    const result = await service.getIntro('126508', '12', null);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      intro: { restdate: '', usetime: '09:00-18:00' },
      introSource: 'live',
      introCheckedAt: '2026-09-13T00:00:00.000Z',
    });
  });

  it('builds the request URL with the raw service key concatenated (never re-encoded)', async () => {
    mockFetchOnce(successBody);

    await service.getIntro('126508', '12', null);

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('serviceKey=test-service-key&');
    expect(calledUrl).toContain('contentId=126508');
    expect(calledUrl).toContain('contentTypeId=12');
  });

  it('returns a cache hit within the TTL without calling fetch again', async () => {
    mockFetchOnce(successBody);
    await service.getIntro('126508', '12', null);

    jest.setSystemTime(new Date('2026-09-13T00:10:00.000Z'));
    const second = await service.getIntro('126508', '12', null);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(second.introSource).toBe('cache');
    expect(second.intro).toEqual({ restdate: '', usetime: '09:00-18:00' });
  });

  it('re-fetches once the cache TTL has expired', async () => {
    mockFetchOnce(successBody);
    await service.getIntro('126508', '12', null);

    jest.setSystemTime(new Date('2026-09-13T00:25:00.000Z'));
    (global.fetch as jest.Mock).mockClear();
    mockFetchOnce(successBody);
    const second = await service.getIntro('126508', '12', null);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(second.introSource).toBe('live');
  });

  it('falls back to the ES-synced intro when the TourAPI response is not ok', async () => {
    mockFetchOnce({}, false);
    const fallback = { usetime: 'from-es' };

    const result = await service.getIntro('126508', '12', fallback);

    expect(result).toEqual({
      intro: fallback,
      introSource: 'synced',
      introCheckedAt: '2026-09-13T00:00:00.000Z',
    });
  });

  it('falls back to the ES-synced intro when the TourAPI resultCode is not 0000', async () => {
    mockFetchOnce({ response: { header: { resultCode: '99' }, body: {} } });
    const fallback = { usetime: 'from-es' };

    const result = await service.getIntro('126508', '12', fallback);

    expect(result.introSource).toBe('synced');
    expect(result.intro).toEqual(fallback);
  });

  it('falls back to the ES-synced intro when fetch itself throws (network error)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));
    const fallback = { usetime: 'from-es' };

    const result = await service.getIntro('126508', '12', fallback);

    expect(result.introSource).toBe('synced');
    expect(result.intro).toEqual(fallback);
  });

  it('falls back to synced without calling fetch once the daily quota is exhausted', async () => {
    mockFetchOnce(successBody);
    await service.getIntro('a', '12', null);
    mockFetchOnce(successBody);
    await service.getIntro('b', '12', null);

    (global.fetch as jest.Mock).mockClear();
    const fallback = { usetime: 'from-es' };
    const result = await service.getIntro('c', '12', fallback);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.introSource).toBe('synced');
    expect(result.intro).toEqual(fallback);
  });

  it('resets the daily quota after KST midnight passes', async () => {
    mockFetchOnce(successBody);
    await service.getIntro('a', '12', null);
    mockFetchOnce(successBody);
    await service.getIntro('b', '12', null);

    // KST 자정은 UTC 15:00. 2026-09-13T15:00:00Z 이후는 다음 날(KST)이라 카운터가 리셋된다.
    jest.setSystemTime(new Date('2026-09-13T15:00:01.000Z'));
    mockFetchOnce(successBody);
    const result = await service.getIntro('c', '12', null);

    expect(result.introSource).toBe('live');
  });
});
