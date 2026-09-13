import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EsClientService } from '../search/es-client.service';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let service: FavoritesService;
  const prisma = {
    favorite: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const es = { placeExists: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FavoritesService(
      prisma as unknown as PrismaService,
      es as unknown as EsClientService,
    );
  });

  describe('list', () => {
    it('lists the favorites belonging to the given user, most recent first', async () => {
      prisma.favorite.findMany.mockResolvedValue([{ contentId: '1' }]);

      const result = await service.list(9n);

      expect(prisma.favorite.findMany).toHaveBeenCalledWith({
        where: { userId: 9n },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([{ contentId: '1' }]);
    });
  });

  describe('add', () => {
    it('rejects a contentId that does not exist in ES', async () => {
      es.placeExists.mockResolvedValue(false);

      await expect(service.add(9n, '999999')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.favorite.upsert).not.toHaveBeenCalled();
    });

    it('upserts the favorite (idempotent — favoriting twice does not error)', async () => {
      es.placeExists.mockResolvedValue(true);
      prisma.favorite.upsert.mockResolvedValue({
        userId: 9n,
        contentId: '126508',
      });

      await service.add(9n, '126508');

      expect(prisma.favorite.upsert).toHaveBeenCalledWith({
        where: { userId_contentId: { userId: 9n, contentId: '126508' } },
        create: { userId: 9n, contentId: '126508' },
        update: {},
      });
    });
  });

  describe('remove', () => {
    it('deletes the favorite if it exists (idempotent — no error if it does not)', async () => {
      prisma.favorite.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove(9n, '126508');

      expect(prisma.favorite.deleteMany).toHaveBeenCalledWith({
        where: { userId: 9n, contentId: '126508' },
      });
    });
  });
});
