import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Courses (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `courses-e2e-${Date.now()}@example.com`;
  let accessToken: string;
  const REAL_CONTENT_ID = '987810'; // 실제 pettour-place 문서 (부산 해운대구)

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
        nickname: '코스테스트',
      })
      .expect(201);
    accessToken = (signupRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    const user = await prisma.user.findFirst({ where: { email: testEmail } });
    if (user) {
      await prisma.courseItem.deleteMany({
        where: { course: { userId: user.id } },
      });
      await prisma.course.deleteMany({ where: { userId: user.id } });
    }
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  function auth(req: request.Test) {
    return req.set('Authorization', `Bearer ${accessToken}`);
  }

  it('requires authentication for the owner routes', () => {
    return request(app.getHttpServer()).get('/courses').expect(401);
  });

  it('creates a course with isPublic defaulting to false and no shareSlug', async () => {
    const res = await auth(
      request(app.getHttpServer()).post('/courses').send({
        title: '부산 2박3일',
        startDate: '2026-10-01',
        endDate: '2026-10-03',
      }),
    ).expect(201);

    expect(res.body).toMatchObject({
      title: '부산 2박3일',
      isPublic: false,
      shareSlug: null,
    });
    expect(typeof (res.body as { id: string }).id).toBe('string');
  });

  it("rejects adding an item with a contentId that doesn't exist in ES", async () => {
    const listRes = await auth(
      request(app.getHttpServer()).get('/courses'),
    ).expect(200);
    const courseId = (listRes.body as { items: { id: string }[] }).items[0].id;

    await auth(
      request(app.getHttpServer())
        .post(`/courses/${courseId}/items`)
        .send({ dayNo: 1, contentId: 'e2e-does-not-exist' }),
    ).expect(404);
  });

  it('adds items to a course, auto-appending sortOrder, and reads them back ordered', async () => {
    const listRes = await auth(
      request(app.getHttpServer()).get('/courses'),
    ).expect(200);
    const courseId = (listRes.body as { items: { id: string }[] }).items[0].id;

    await auth(
      request(app.getHttpServer()).post(`/courses/${courseId}/items`).send({
        dayNo: 1,
        contentId: REAL_CONTENT_ID,
        titleSnapshot: '해운대',
      }),
    ).expect(201);

    const second = await auth(
      request(app.getHttpServer()).post(`/courses/${courseId}/items`).send({
        dayNo: 1,
        contentId: REAL_CONTENT_ID,
        titleSnapshot: '두번째',
      }),
    ).expect(201);
    expect((second.body as { sortOrder: number }).sortOrder).toBe(1);

    const detail = await auth(
      request(app.getHttpServer()).get(`/courses/${courseId}`),
    ).expect(200);
    const items = (detail.body as { items: { titleSnapshot: string }[] }).items;
    expect(items.map((i) => i.titleSnapshot)).toEqual(['해운대', '두번째']);
  });

  it('updates an item (memo) and rejects updating an item on another course id', async () => {
    const listRes = await auth(
      request(app.getHttpServer()).get('/courses'),
    ).expect(200);
    const courseId = (listRes.body as { items: { id: string }[] }).items[0].id;
    const detail = await auth(
      request(app.getHttpServer()).get(`/courses/${courseId}`),
    ).expect(200);
    const itemId = (detail.body as { items: { id: string }[] }).items[0].id;

    const updated = await auth(
      request(app.getHttpServer())
        .patch(`/courses/${courseId}/items/${itemId}`)
        .send({ memo: '주차 가능' }),
    ).expect(200);
    expect((updated.body as { memo: string }).memo).toBe('주차 가능');

    await auth(
      request(app.getHttpServer())
        .patch(`/courses/999999999/items/${itemId}`)
        .send({
          memo: 'x',
        }),
    ).expect(404);
  });

  it('makes the course public via PATCH, generating a shareSlug, and it becomes visible on the public route without auth', async () => {
    const listRes = await auth(
      request(app.getHttpServer()).get('/courses'),
    ).expect(200);
    const courseId = (listRes.body as { items: { id: string }[] }).items[0].id;

    const updated = await auth(
      request(app.getHttpServer())
        .patch(`/courses/${courseId}`)
        .send({ isPublic: true }),
    ).expect(200);
    const shareSlug = (updated.body as { shareSlug: string }).shareSlug;
    expect(typeof shareSlug).toBe('string');

    const shared = await request(app.getHttpServer())
      .get(`/courses/shared/${shareSlug}`)
      .expect(200);
    expect((shared.body as { title: string }).title).toBe('부산 2박3일');
    expect(
      (shared.body as { items: { titleSnapshot: string }[] }).items.length,
    ).toBe(2);
  });

  it('returns 404 on the public route for a course that is not public', async () => {
    await request(app.getHttpServer())
      .get('/courses/shared/not-a-real-slug')
      .expect(404);
  });

  it('deletes a course along with its items', async () => {
    const listRes = await auth(
      request(app.getHttpServer()).get('/courses'),
    ).expect(200);
    const courseId = (listRes.body as { items: { id: string }[] }).items[0].id;

    await auth(
      request(app.getHttpServer()).delete(`/courses/${courseId}`),
    ).expect(204);
    await auth(request(app.getHttpServer()).get(`/courses/${courseId}`)).expect(
      404,
    );

    const remaining = await prisma.courseItem.count({
      where: { courseId: BigInt(courseId) },
    });
    expect(remaining).toBe(0);
  });
});
