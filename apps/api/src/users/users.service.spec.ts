import { Test, TestingModule } from '@nestjs/testing';
import { AuthProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UsersService);
  });

  it('findByEmail() looks up an active (non-deleted) user by email', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 1n, email: 'a@b.com' });

    const result = await service.findByEmail('a@b.com');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'a@b.com', deletedAt: null },
    });
    expect(result).toEqual({ id: 1n, email: 'a@b.com' });
  });

  it('findByEmail() normalizes email to lowercase and trims whitespace before lookup', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await service.findByEmail('  Foo@Bar.com  ');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'foo@bar.com', deletedAt: null },
    });
  });

  it('findByProviderUid() looks up a user by provider + providerUid', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 2n,
      provider: AuthProvider.kakao,
    });

    const result = await service.findByProviderUid(
      AuthProvider.kakao,
      'kakao-123',
    );

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { provider: AuthProvider.kakao, providerUid: 'kakao-123' },
    });
    expect(result).toEqual({ id: 2n, provider: AuthProvider.kakao });
  });

  it('createLocal() creates a local-provider user', async () => {
    prisma.user.create.mockResolvedValue({ id: 3n });

    await service.createLocal({
      email: 'a@b.com',
      passwordHash: 'hashed',
      nickname: '멍냥이',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        provider: AuthProvider.local,
        email: 'a@b.com',
        passwordHash: 'hashed',
        nickname: '멍냥이',
      },
    });
  });

  it('createLocal() normalizes email to lowercase and trims whitespace before insert', async () => {
    prisma.user.create.mockResolvedValue({ id: 3n });

    await service.createLocal({
      email: '  Foo@Bar.com  ',
      passwordHash: 'hashed',
      nickname: '멍냥이',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        provider: AuthProvider.local,
        email: 'foo@bar.com',
        passwordHash: 'hashed',
        nickname: '멍냥이',
      },
    });
  });

  it('reactivate() clears deletedAt for the given user id', async () => {
    prisma.user.update.mockResolvedValue({ id: 7n, deletedAt: null });

    const result = await service.reactivate(7n);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7n },
      data: { deletedAt: null },
    });
    expect(result).toEqual({ id: 7n, deletedAt: null });
  });

  it('createOAuth() creates an OAuth-provider user with no email/password', async () => {
    prisma.user.create.mockResolvedValue({ id: 4n });

    await service.createOAuth({
      provider: AuthProvider.kakao,
      providerUid: 'kakao-123',
      nickname: '멍냥이',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        provider: AuthProvider.kakao,
        providerUid: 'kakao-123',
        nickname: '멍냥이',
      },
    });
  });

  it('findById() looks up an active (non-deleted) user by id', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 8n, nickname: '멍냥이' });

    const result = await service.findById(8n);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 8n, deletedAt: null },
    });
    expect(result).toEqual({ id: 8n, nickname: '멍냥이' });
  });

  it('updateProfile() updates only the given fields', async () => {
    prisma.user.update.mockResolvedValue({ id: 8n, nickname: '새이름' });

    await service.updateProfile(8n, { nickname: '새이름' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 8n },
      data: { nickname: '새이름' },
    });
  });

  it('updateProfile() updates profileImageUrl when given', async () => {
    prisma.user.update.mockResolvedValue({ id: 8n });

    await service.updateProfile(8n, { profileImageUrl: 'https://x/y.png' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 8n },
      data: { profileImageUrl: 'https://x/y.png' },
    });
  });

  it('softDelete() sets deletedAt for the given user id', async () => {
    prisma.user.update.mockResolvedValue({ id: 8n, deletedAt: new Date() });

    await service.softDelete(8n);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 8n },
      data: { deletedAt: expect.any(Date) as Date },
    });
  });
});
