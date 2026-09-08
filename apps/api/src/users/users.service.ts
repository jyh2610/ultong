import { Injectable } from '@nestjs/common';
import { AuthProvider, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  findByProviderUid(provider: AuthProvider, providerUid: string): Promise<User | null> {
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
        email: params.email,
        passwordHash: params.passwordHash,
        nickname: params.nickname,
      },
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
