import { Injectable, NotFoundException } from '@nestjs/common';
import { Favorite } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EsClientService } from '../search/es-client.service';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly es: EsClientService,
  ) {}

  list(userId: bigint): Promise<Favorite[]> {
    return this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: bigint, contentId: string): Promise<Favorite> {
    if (!(await this.es.placeExists(contentId))) {
      throw new NotFoundException('시설을 찾을 수 없습니다.');
    }

    return this.prisma.favorite.upsert({
      where: { userId_contentId: { userId, contentId } },
      create: { userId, contentId },
      update: {},
    });
  }

  async remove(userId: bigint, contentId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, contentId } });
  }
}
