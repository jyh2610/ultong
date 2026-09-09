import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const DURATION_UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  issueAccessToken(userId: bigint): string {
    return this.jwtService.sign(
      { sub: userId.toString() },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ??
          '1h') as JwtSignOptions['expiresIn'],
      },
    );
  }

  async issueRefreshToken(userId: bigint): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() +
        this.parseDurationMs(
          this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d',
        ),
    );

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: this.hashRefreshToken(raw), expiresAt },
    });

    return raw;
  }

  async rotateRefreshToken(
    rawToken: string,
  ): Promise<{ userId: bigint; refreshToken: string }> {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashRefreshToken(rawToken) },
      include: { user: true },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('유효하지 않은 refresh token입니다.');
    }

    if (existing.user.deletedAt !== null || existing.user.status !== 'active') {
      throw new UnauthorizedException('유효하지 않은 refresh token입니다.');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const refreshToken = await this.issueRefreshToken(existing.userId);
    return { userId: existing.userId, refreshToken };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashRefreshToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashRefreshToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private parseDurationMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }
    return Number(match[1]) * DURATION_UNIT_MS[match[2]];
  }
}
