import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Pets (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `pets-e2e-${Date.now()}@example.com`;
  let accessToken: string;
  let userId: string;

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
      .send({ email: testEmail, password: 'password123', nickname: '펫테스트' })
      .expect(201);
    accessToken = (signupRes.body as { accessToken: string }).accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    userId = (meRes.body as { id: string }).id;
  });

  afterAll(async () => {
    await prisma.pet.deleteMany({ where: { userId: BigInt(userId) } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  function auth(req: request.Test) {
    return req.set('Authorization', `Bearer ${accessToken}`);
  }

  it('requires authentication', () => {
    return request(app.getHttpServer()).get('/pets').expect(401);
  });

  it('creates the first pet as isDefault=true automatically, even if the request says otherwise', async () => {
    const res = await auth(
      request(app.getHttpServer()).post('/pets').send({
        name: '뽀삐',
        species: 'dog',
        breed: '말티즈',
        weightKg: 4.5,
        sizeClass: '소형',
        hasCage: true,
        isDefault: false,
      }),
    ).expect(201);

    expect(res.body).toMatchObject({
      name: '뽀삐',
      species: 'dog',
      breed: '말티즈',
      weightKg: 4.5,
      sizeClass: '소형',
      hasCage: true,
      isDangerousBreed: false,
      isDefault: true,
    });
    expect(typeof (res.body as { id: string }).id).toBe('string');
  });

  it('creates a second pet as isDefault=false by default, and lists both', async () => {
    await auth(
      request(app.getHttpServer())
        .post('/pets')
        .send({ name: '초코', species: 'cat' }),
    ).expect(201);

    const res = await auth(request(app.getHttpServer()).get('/pets')).expect(
      200,
    );

    const items = (
      res.body as { items: { name: string; isDefault: boolean }[] }
    ).items;
    expect(items).toHaveLength(2);
    expect(items.find((p) => p.name === '초코')?.isDefault).toBe(false);
    expect(items.find((p) => p.name === '뽀삐')?.isDefault).toBe(true);
  });

  it('switches the default pet and unsets the previous one', async () => {
    const listRes = await auth(
      request(app.getHttpServer()).get('/pets'),
    ).expect(200);
    const items = (listRes.body as { items: { id: string; name: string }[] })
      .items;
    const choco = items.find((p) => p.name === '초코')!;

    await auth(
      request(app.getHttpServer())
        .patch(`/pets/${choco.id}`)
        .send({ isDefault: true }),
    ).expect(200);

    const after = await auth(request(app.getHttpServer()).get('/pets')).expect(
      200,
    );
    const afterItems = (
      after.body as { items: { name: string; isDefault: boolean }[] }
    ).items;
    expect(afterItems.find((p) => p.name === '초코')?.isDefault).toBe(true);
    expect(afterItems.find((p) => p.name === '뽀삐')?.isDefault).toBe(false);
  });

  it('returns 404 for a pet id that does not exist', () => {
    return auth(request(app.getHttpServer()).get('/pets/999999999')).expect(
      404,
    );
  });

  it('deletes a pet', async () => {
    const listRes = await auth(
      request(app.getHttpServer()).get('/pets'),
    ).expect(200);
    const items = (listRes.body as { items: { id: string; name: string }[] })
      .items;
    const choco = items.find((p) => p.name === '초코')!;

    await auth(request(app.getHttpServer()).delete(`/pets/${choco.id}`)).expect(
      204,
    );
    await auth(request(app.getHttpServer()).get(`/pets/${choco.id}`)).expect(
      404,
    );
  });

  it("rejects accessing another user's pet", async () => {
    const otherEmail = `pets-e2e-other-${Date.now()}@example.com`;
    const otherSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: otherEmail,
        password: 'password123',
        nickname: '다른유저',
      })
      .expect(201);
    const otherToken = (otherSignup.body as { accessToken: string })
      .accessToken;

    const myPets = await auth(request(app.getHttpServer()).get('/pets')).expect(
      200,
    );
    const myPetId = (myPets.body as { items: { id: string }[] }).items[0].id;

    await request(app.getHttpServer())
      .get(`/pets/${myPetId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await prisma.user.deleteMany({ where: { email: otherEmail } });
  });
});
