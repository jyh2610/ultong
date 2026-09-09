// apps/api/src/auth/token.service.spec.ts
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  const prisma = {
    refreshToken: {
      create: jest.fn<
        Promise<unknown>,
        [{ data: { userId: bigint; tokenHash: string; expiresAt: Date } }]
      >(),
      findUnique: jest.fn<
        Promise<{
          id: bigint;
          userId: bigint;
          tokenHash: string;
          revokedAt: Date | null;
          expiresAt: Date;
          user: { deletedAt: Date | null; status: string };
        } | null>,
        [{ where: { tokenHash: string }; include: { user: true } }]
      >(),
      update: jest.fn<
        Promise<unknown>,
        [{ where: { id: bigint }; data: { revokedAt: Date } }]
      >(),
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [
          {
            where: { tokenHash: string; revokedAt: null };
            data: { revokedAt: Date };
          },
        ]
      >(),
    },
  };
  const config = {
    getOrThrow: jest.fn().mockReturnValue('test-access-secret'),
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_EXPIRES_IN') return '1h';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TokenService(
      new JwtService(),
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
  });

  it('issueAccessToken() returns a JWT with sub = userId as a string', () => {
    const token = service.issueAccessToken(42n);
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString(),
    ) as {
      sub: string;
    };
    expect(payload.sub).toBe('42');
  });

  it('issueRefreshToken() stores a SHA-256 hash of the returned raw token, never the raw value', async () => {
    prisma.refreshToken.create.mockResolvedValue({});

    const raw = await service.issueRefreshToken(7n);

    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    const createArgs = prisma.refreshToken.create.mock.calls[0][0];
    expect(createArgs.data.userId).toBe(7n);
    expect(createArgs.data.tokenHash).toBe(
      createHash('sha256').update(raw).digest('hex'),
    );
    expect(createArgs.data.tokenHash).not.toBe(raw);
  });

  it('rotateRefreshToken() revokes the old token and issues a new one', async () => {
    const raw = 'a-raw-refresh-token';
    const hash = createHash('sha256').update(raw).digest('hex');
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 1n,
      userId: 9n,
      tokenHash: hash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1_000_000),
      user: { deletedAt: null, status: 'active' },
    });
    prisma.refreshToken.update.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.rotateRefreshToken(raw);

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { revokedAt: expect.any(Date) as Date },
    });
    expect(result.userId).toBe(9n);
    expect(typeof result.refreshToken).toBe('string');
  });

  it('rotateRefreshToken() rejects an unknown token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.rotateRefreshToken('unknown')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rotateRefreshToken() rejects an already-revoked token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 1n,
      userId: 9n,
      tokenHash: 'x',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1_000_000),
      user: { deletedAt: null, status: 'active' },
    });

    await expect(service.rotateRefreshToken('revoked-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rotateRefreshToken() rejects an expired token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 1n,
      userId: 9n,
      tokenHash: 'x',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
      user: { deletedAt: null, status: 'active' },
    });

    await expect(service.rotateRefreshToken('expired-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rotateRefreshToken() rejects a token belonging to a soft-deleted user', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 1n,
      userId: 9n,
      tokenHash: 'x',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1_000_000),
      user: { deletedAt: new Date(), status: 'active' },
    });

    await expect(
      service.rotateRefreshToken('deleted-user-token'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rotateRefreshToken() rejects a token belonging to a suspended user', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 1n,
      userId: 9n,
      tokenHash: 'x',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1_000_000),
      user: { deletedAt: null, status: 'suspended' },
    });

    await expect(
      service.rotateRefreshToken('suspended-user-token'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('revokeRefreshToken() marks the matching, not-yet-revoked token as revoked', async () => {
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await service.revokeRefreshToken('a-raw-refresh-token');

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash('sha256')
          .update('a-raw-refresh-token')
          .digest('hex'),
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) as Date },
    });
  });
});
