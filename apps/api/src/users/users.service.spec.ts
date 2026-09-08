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

  it('findByProviderUid() looks up a user by provider + providerUid', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 2n, provider: AuthProvider.kakao });

    const result = await service.findByProviderUid(AuthProvider.kakao, 'kakao-123');

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
});
