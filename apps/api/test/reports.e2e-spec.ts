import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Reports (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `reports-e2e-${Date.now()}@example.com`;
  let accessToken: string;
  // 실제 pettour-place 문서를 재보용 시설로 쓰되, 다른 e2e와 겹치지 않도록
  // 이 테스트 전용의 별도 실제 contentId를 쓴다 (단성벽화마을은 favorites e2e가 쓴다).
  const REAL_CONTENT_ID = '126081'; // 부산 해운대구 (실데이터)

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
    prisma = app.get(PrismaService);

    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'password123',
        nickname: '제보테스트',
      })
      .expect(201);
    accessToken = (signupRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    const user = await prisma.user.findFirst({ where: { email: testEmail } });
    if (user) {
      await prisma.report.deleteMany({ where: { userId: user.id } });
    }
    await prisma.placeReportStats.deleteMany({
      where: { contentId: REAL_CONTENT_ID },
    });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  function auth(req: request.Test) {
    return req.set('Authorization', `Bearer ${accessToken}`);
  }

  it('requires authentication', () => {
    return request(app.getHttpServer()).get('/reports').expect(401);
  });

  it('rejects reporting a contentId that does not exist in ES', () => {
    return auth(
      request(app.getHttpServer())
        .post('/reports')
        .send({ contentId: 'e2e-does-not-exist', type: 'denied_entry' }),
    ).expect(404);
  });

  it('creates a report for a real place, and it appears in my report list', async () => {
    const res = await auth(
      request(app.getHttpServer()).post('/reports').send({
        contentId: REAL_CONTENT_ID,
        type: 'denied_entry',
        detail: '입장을 거부당했습니다',
      }),
    ).expect(201);

    expect(res.body).toMatchObject({
      contentId: REAL_CONTENT_ID,
      type: 'denied_entry',
      detail: '입장을 거부당했습니다',
      status: 'pending',
    });

    const listRes = await auth(
      request(app.getHttpServer()).get('/reports'),
    ).expect(200);
    const items = (listRes.body as { items: { contentId: string }[] }).items;
    expect(items).toHaveLength(1);
    expect(items[0].contentId).toBe(REAL_CONTENT_ID);
  });

  it('filters my reports by contentId', async () => {
    const res = await auth(
      request(app.getHttpServer())
        .get('/reports')
        .query({ contentId: REAL_CONTENT_ID }),
    ).expect(200);

    expect((res.body as { items: unknown[] }).items).toHaveLength(1);

    const empty = await auth(
      request(app.getHttpServer())
        .get('/reports')
        .query({ contentId: 'some-other-place' }),
    ).expect(200);
    expect((empty.body as { items: unknown[] }).items).toHaveLength(0);
  });

  it('flips place_report_stats.warning to true once 3 reports accumulate', async () => {
    await auth(
      request(app.getHttpServer())
        .post('/reports')
        .send({ contentId: REAL_CONTENT_ID, type: 'closed' }),
    ).expect(201);
    await auth(
      request(app.getHttpServer())
        .post('/reports')
        .send({ contentId: REAL_CONTENT_ID, type: 'closed' }),
    ).expect(201);

    const stats = await prisma.placeReportStats.findUniqueOrThrow({
      where: { contentId: REAL_CONTENT_ID },
    });
    expect(stats.count).toBe(3);
    expect(stats.warning).toBe(true);
  });
});
