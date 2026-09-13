import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Favorites (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `favorites-e2e-${Date.now()}@example.com`;
  let accessToken: string;
  const REAL_CONTENT_ID = '2787086'; // 실제 pettour-place 문서 (단양 단성벽화마을)

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
        nickname: '찜테스트',
      })
      .expect(201);
    accessToken = (signupRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    // Favorite.user는 onDelete 기본값(Restrict)이라, 테스트 중간 실패로 즐겨찾기가
    // 남아있으면 유저 삭제가 FK 위반으로 막힌다 — 먼저 정리한다.
    const user = await prisma.user.findFirst({ where: { email: testEmail } });
    if (user) {
      await prisma.favorite.deleteMany({ where: { userId: user.id } });
    }
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  function auth(req: request.Test) {
    return req.set('Authorization', `Bearer ${accessToken}`);
  }

  it('requires authentication', () => {
    return request(app.getHttpServer()).get('/favorites').expect(401);
  });

  it('rejects favoriting a contentId that does not exist in ES', async () => {
    await auth(
      request(app.getHttpServer())
        .post('/favorites')
        .send({ contentId: 'e2e-does-not-exist' }),
    ).expect(404);
  });

  it('adds a favorite for a real place, lists it, and adding it again is idempotent', async () => {
    await auth(
      request(app.getHttpServer())
        .post('/favorites')
        .send({ contentId: REAL_CONTENT_ID }),
    ).expect(201);

    // 다시 찜해도 에러 없이 그대로 (토글이 아니라 idempotent create)
    await auth(
      request(app.getHttpServer())
        .post('/favorites')
        .send({ contentId: REAL_CONTENT_ID }),
    ).expect(201);

    const res = await auth(
      request(app.getHttpServer()).get('/favorites'),
    ).expect(200);
    const items = (res.body as { items: { contentId: string }[] }).items;
    expect(items).toHaveLength(1);
    expect(items[0].contentId).toBe(REAL_CONTENT_ID);
  });

  it('removes a favorite, and removing again is idempotent (no error)', async () => {
    await auth(
      request(app.getHttpServer()).delete(`/favorites/${REAL_CONTENT_ID}`),
    ).expect(204);

    await auth(
      request(app.getHttpServer()).delete(`/favorites/${REAL_CONTENT_ID}`),
    ).expect(204);

    const res = await auth(
      request(app.getHttpServer()).get('/favorites'),
    ).expect(200);
    expect((res.body as { items: unknown[] }).items).toHaveLength(0);
  });
});
