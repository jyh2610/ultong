import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { EsClientService } from '../src/search/es-client.service';

describe('Place detail (e2e)', () => {
  let app: INestApplication<App>;
  let es: EsClientService;

  const DETAIL_ID = 'e2e-detail-test';

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

    await es.client.index({
      index: 'pettour-place',
      id: DETAIL_ID,
      refresh: true,
      document: {
        title: 'e2e 테스트 상세 시설',
        category: { content_type_id: '12' },
        pet_tags: {
          weight_limit_kg: 15,
          weight_op: 'lte',
          confidence: 'certain',
        },
        // 실제 TourAPI 호출은 이 가짜 contentId에 대해 항상 실패하므로,
        // 이 값이 그대로 폴백(source=synced)으로 나와야 한다.
        intro: { usetime: 'e2e 테스트 운영시간' },
      },
    });
  });

  afterAll(async () => {
    await es.client.delete({ index: 'pettour-place', id: DETAIL_ID });
    await app.close();
  });

  it('returns the place with match computed and falls back to the ES intro snapshot', async () => {
    const res = await request(app.getHttpServer())
      .get(`/places/${DETAIL_ID}`)
      .query({ weightKg: 13 })
      .expect(200);

    expect(res.body).toMatchObject({
      contentId: DETAIL_ID,
      title: 'e2e 테스트 상세 시설',
      match: {
        verdict: 'allowed',
        confidence: 'certain',
        areaRestricted: false,
        reasons: ['체중 13kg ≤ 15kg 충족'],
      },
      intro: { usetime: 'e2e 테스트 운영시간' },
      introSource: 'synced',
    });
    const body = res.body as { introCheckedAt: unknown };
    expect(typeof body.introCheckedAt).toBe('string');
  });

  it('returns 404 for a contentId that does not exist', () => {
    return request(app.getHttpServer())
      .get('/places/e2e-does-not-exist')
      .expect(404);
  });
});
