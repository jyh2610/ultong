import { Injectable } from '@nestjs/common';
import { AuthProvider, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), deletedAt: null },
    });
  }

  // uq_users_provider has no deleted_at predicate, so a soft-deleted user's
  // row still occupies its (provider, providerUid) slot. Filtering deletedAt
  // here would make findByProviderUid miss that row, and the caller would
  // then try to createOAuth() and collide on that same unique index. Do not
  // add a deletedAt filter — see AuthService.loginWithKakao for how the
  // soft-deleted case is handled instead (reactivation).
  findByProviderUid(
    provider: AuthProvider,
    providerUid: string,
  ): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { provider, providerUid } });
  }

  createLocal(params: {
    email: string;
    passwordHash: string;
    nickname: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        provider: AuthProvider.local,
        email: params.email.trim().toLowerCase(),
        passwordHash: params.passwordHash,
        nickname: params.nickname,
      },
    });
  }

  reactivate(userId: bigint): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null },
    });
  }

  createOAuth(params: {
    provider: AuthProvider;
    providerUid: string;
    nickname: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        provider: params.provider,
        providerUid: params.providerUid,
        nickname: params.nickname,
      },
    });
  }
}
