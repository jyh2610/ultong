import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { EsClientService } from '../src/search/es-client.service';

describe('Places search (e2e)', () => {
  let app: INestApplication<App>;
  let es: EsClientService;

  const ALLOWED_ID = 'e2e-search-allowed';
  const DENIED_ID = 'e2e-search-denied';
  const INACTIVE_ID = 'e2e-search-inactive';
  const DANGEROUS_ID = 'e2e-search-dangerous';
  const testDocIds = [ALLOWED_ID, DENIED_ID, INACTIVE_ID, DANGEROUS_ID];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    es = app.get(EsClientService);

    await es.client.bulk({
      refresh: true,
      operations: [
        { index: { _index: 'pettour-place', _id: ALLOWED_ID } },
        {
          title: 'e2e 테스트 허용 공원',
          addr1: '부산광역시 서구 e2e테스트로 1',
          location: { lat: 35.07, lon: 129.01 },
          category: { content_type_id: '12', lcls1: 'NA' },
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
            confidence_score: 1.0,
            area_scope: 'all',
          },
          sync: { is_active: true, modified_at: '2026-09-01T00:00:00.000Z' },
        },
        { index: { _index: 'pettour-place', _id: DENIED_ID } },
        {
          title: 'e2e 테스트 동반불가 시설',
          addr1: '부산광역시 서구 e2e테스트로 2',
          location: { lat: 35.07, lon: 129.02 },
          category: { content_type_id: '12', lcls1: 'NA' },
          region: {
            ldong_regn_cd: '26',
            ldong_signgu_cd: '140',
            sido: '부산광역시',
            sigungu: '서구',
          },
          pet_tags: {
            pet_allowed: false,
            confidence: 'certain',
            confidence_score: 1.0,
          },
          sync: { is_active: true, modified_at: '2026-09-01T00:00:00.000Z' },
        },
        { index: { _index: 'pettour-place', _id: INACTIVE_ID } },
        {
          title: 'e2e 테스트 폐업 시설',
          addr1: '부산광역시 서구 e2e테스트로 3',
          location: { lat: 35.07, lon: 129.03 },
          category: { content_type_id: '12', lcls1: 'NA' },
          region: {
            ldong_regn_cd: '26',
            ldong_signgu_cd: '140',
            sido: '부산광역시',
            sigungu: '서구',
          },
          pet_tags: { confidence: 'certain', confidence_score: 1.0 },
          sync: { is_active: false, modified_at: '2026-09-01T00:00:00.000Z' },
        },
        { index: { _index: 'pettour-place', _id: DANGEROUS_ID } },
        {
          title: 'e2e 테스트 맹견제외 시설',
          addr1: '부산광역시 서구 e2e테스트로 4',
          location: { lat: 35.07, lon: 129.04 },
          category: { content_type_id: '12', lcls1: 'NA' },
          region: {
            ldong_regn_cd: '26',
            ldong_signgu_cd: '140',
            sido: '부산광역시',
            sigungu: '서구',
          },
          pet_tags: {
            breed_excluded: ['맹견'],
            confidence: 'certain',
            confidence_score: 1.0,
          },
          sync: { is_active: true, modified_at: '2026-09-01T00:00:00.000Z' },
        },
      ],
    });
  });

  afterAll(async () => {
    await es.client.deleteByQuery({
      index: 'pettour-place',
      query: { ids: { values: testDocIds } },
    });
    await app.close();
  });

  function idsOf(body: unknown): string[] {
    return (body as { items: { contentId: string }[] }).items.map(
      (i) => i.contentId,
    );
  }

  it('excludes pet_allowed=false and sync.is_active=false docs from every search (rules 0 and 1)', async () => {
    const res = await request(app.getHttpServer())
      .get('/places/search')
      .query({ q: 'e2e 테스트', size: 50 })
      .expect(200);

    const ids = idsOf(res.body);
    expect(ids).toContain(ALLOWED_ID);
    expect(ids).toContain(DANGEROUS_ID);
    expect(ids).not.toContain(DENIED_ID);
    expect(ids).not.toContain(INACTIVE_ID);
  });

  it('excludes breed_excluded=맹견 docs only when excludeDangerous=true', async () => {
    const withoutFlag = await request(app.getHttpServer())
      .get('/places/search')
      .query({ q: 'e2e 테스트', size: 50 })
      .expect(200);
    expect(idsOf(withoutFlag.body)).toContain(DANGEROUS_ID);

    const withFlag = await request(app.getHttpServer())
      .get('/places/search')
      .query({ q: 'e2e 테스트', excludeDangerous: 'true', size: 50 })
      .expect(200);
    expect(idsOf(withFlag.body)).not.toContain(DANGEROUS_ID);
  });

  it('computes match via matchVerdict for the allowed doc using weightKg', async () => {
    const res = await request(app.getHttpServer())
      .get('/places/search')
      .query({ q: 'e2e 테스트 허용', weightKg: 13 })
      .expect(200);

    const item = (
      res.body as { items: { contentId: string; match: unknown }[] }
    ).items.find((i) => i.contentId === ALLOWED_ID);
    expect(item?.match).toEqual({
      verdict: 'allowed',
      confidence: 'certain',
      areaRestricted: false,
      reasons: ['체중 13kg ≤ 15kg 충족'],
    });
  });

  it('resolves category/region names via the /codes join', async () => {
    const res = await request(app.getHttpServer())
      .get('/places/search')
      .query({ q: 'e2e 테스트 허용' })
      .expect(200);

    const item = (
      res.body as {
        items: {
          contentId: string;
          category: { contentType: string };
          region: { sido: string; sigungu: string };
        }[];
      }
    ).items.find((i) => i.contentId === ALLOWED_ID);
    expect(item?.category.contentType).toBe('관광지');
    expect(item?.region.sido).toBe('부산광역시');
    expect(item?.region.sigungu).toBe('서구');
  });

  it('returns facets alongside the results', async () => {
    const res = await request(app.getHttpServer())
      .get('/places/search')
      .query({ q: 'e2e 테스트', size: 50 })
      .expect(200);

    const body = res.body as {
      facets: { byType: unknown[]; byConfidence: unknown[] };
    };
    expect(Array.isArray(body.facets.byType)).toBe(true);
    expect(Array.isArray(body.facets.byConfidence)).toBe(true);
  });

  it('rejects an invalid sort value with 400', () => {
    return request(app.getHttpServer())
      .get('/places/search')
      .query({ sort: 'not-a-real-sort' })
      .expect(400);
  });

  it('rejects lat/lon/radiusKm query params with 400 (server must never accept precise coordinates)', async () => {
    await request(app.getHttpServer())
      .get('/places/search')
      .query({ lat: 35.16, lon: 129.16, radiusKm: 5 })
      .expect(400);
  });
});
