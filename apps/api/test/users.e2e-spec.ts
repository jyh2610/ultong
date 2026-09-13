import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `users-e2e-${Date.now()}@example.com`;
  let accessToken: string;

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
        nickname: '유저테스트',
      })
      .expect(201);
    accessToken = (signupRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('GET /users/me requires authentication', () => {
    return request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('GET /users/me returns the current profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      provider: 'local',
      email: testEmail,
      nickname: '유저테스트',
      status: 'active',
    });
    expect(typeof (res.body as { id: string }).id).toBe('string');
  });

  it('PATCH /users/me updates the nickname', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nickname: '새닉네임' })
      .expect(200);

    expect((res.body as { nickname: string }).nickname).toBe('새닉네임');

    const getRes = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((getRes.body as { nickname: string }).nickname).toBe('새닉네임');
  });

  it('DELETE /users/me soft-deletes the account and immediately blocks its refresh token', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: 'password123' })
      .expect(200);
    const { refreshToken } = loginRes.body as { refreshToken: string };

    await request(app.getHttpServer())
      .delete('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
