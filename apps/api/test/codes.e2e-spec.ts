import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { EsClientService } from '../src/search/es-client.service';

describe('Codes (e2e)', () => {
  let app: INestApplication<App>;
  let es: EsClientService;
  const testDocIds = [
    'e2e-test-lcls-parent',
    'e2e-test-lcls-child',
    'e2e-test-ldong-parent',
  ];

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
        { index: { _index: 'pettour-code', _id: 'e2e-test-lcls-parent' } },
        {
          code_type: 'lcls',
          code: 'E2ETEST',
          name: 'e2e 테스트 대분류',
          parent_code: null,
          parent_name: null,
          depth: 1,
          path: 'e2e 테스트 대분류',
        },
        { index: { _index: 'pettour-code', _id: 'e2e-test-lcls-child' } },
        {
          code_type: 'lcls',
          code: 'E2ETEST01',
          name: 'e2e 테스트 중분류',
          parent_code: 'E2ETEST',
          parent_name: 'e2e 테스트 대분류',
          depth: 2,
          path: 'e2e 테스트 대분류 > e2e 테스트 중분류',
        },
        { index: { _index: 'pettour-code', _id: 'e2e-test-ldong-parent' } },
        {
          code_type: 'ldong',
          code: 'E2E99',
          name: 'e2e 테스트 시도',
          parent_code: null,
          parent_name: null,
          depth: 1,
          path: 'e2e 테스트 시도',
        },
      ],
    });
  });

  afterAll(async () => {
    await es.client.deleteByQuery({
      index: 'pettour-code',
      query: { ids: { values: testDocIds } },
    });
    await app.close();
  });

  it('GET /codes/categories returns lcls codes including the seeded ones', async () => {
    const res = await request(app.getHttpServer())
      .get('/codes/categories')
      .expect(200);

    const codes = (res.body as { items: { code: string }[] }).items.map(
      (item) => item.code,
    );
    expect(codes).toContain('E2ETEST');
    expect(codes).toContain('E2ETEST01');
  });

  it('GET /codes/categories?parentCode=E2ETEST returns only its children', async () => {
    const res = await request(app.getHttpServer())
      .get('/codes/categories')
      .query({ parentCode: 'E2ETEST' })
      .expect(200);

    expect(res.body).toEqual({
      items: [
        {
          code: 'E2ETEST01',
          name: 'e2e 테스트 중분류',
          parentCode: 'E2ETEST',
          parentName: 'e2e 테스트 대분류',
          depth: 2,
          path: 'e2e 테스트 대분류 > e2e 테스트 중분류',
        },
      ],
    });
  });

  it('GET /codes/regions returns ldong codes including the seeded one', async () => {
    const res = await request(app.getHttpServer())
      .get('/codes/regions')
      .expect(200);

    const codes = (res.body as { items: { code: string }[] }).items.map(
      (item) => item.code,
    );
    expect(codes).toContain('E2E99');
  });
});
