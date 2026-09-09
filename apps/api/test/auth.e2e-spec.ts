import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  // These tests hit the real remote dev database over the network, so each
  // request chain (bcrypt hashing + multiple DB round trips) can exceed the
  // default 5s Jest timeout.
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `auth-e2e-${Date.now()}@example.com`;

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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('rejects signup with an invalid email', () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'not-an-email',
        password: 'password123',
        nickname: 'tester',
      })
      .expect(400);
  });

  it('signs up, logs in, refreshes, reads /me, and logs out', async () => {
    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: 'password123',
        nickname: 'e2e-tester',
      })
      .expect(201);

    const signupBody = signupRes.body as {
      accessToken: string;
      refreshToken: string;
    };
    expect(signupBody.accessToken).toEqual(expect.any(String));
    expect(signupBody.refreshToken).toEqual(expect.any(String));

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: 'password123' })
      .expect(200);

    const { accessToken, refreshToken } = loginRes.body as {
      accessToken: string;
      refreshToken: string;
    };

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer()).get('/auth/me').expect(401);

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    const newRefreshToken = (refreshRes.body as { refreshToken: string })
      .refreshToken;

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: newRefreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: newRefreshToken })
      .expect(401);
  });

  it('rejects login with a wrong password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: 'wrong-password' })
      .expect(401);
  });
});
