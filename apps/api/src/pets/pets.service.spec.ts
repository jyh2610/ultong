import { NotFoundException } from '@nestjs/common';
import { PetSpecies } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PetsService } from './pets.service';

describe('PetsService', () => {
  let service: PetsService;
  const prisma = {
    pet: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // $transaction 콜백에 같은 mock 객체를 tx로 넘겨서, 트랜잭션 안에서 호출되는
    // pet.updateMany/pet.create/pet.update도 위 mock으로 그대로 검증할 수 있게 한다.
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
    service = new PetsService(prisma as unknown as PrismaService);
  });

  describe('list', () => {
    it('lists pets belonging to the given user, ordered by id', async () => {
      prisma.pet.findMany.mockResolvedValue([{ id: 1n }]);

      const result = await service.list(9n);

      expect(prisma.pet.findMany).toHaveBeenCalledWith({
        where: { userId: 9n },
        orderBy: { id: 'asc' },
      });
      expect(result).toEqual([{ id: 1n }]);
    });
  });

  describe('create', () => {
    const dto = {
      name: '뽀삐',
      species: PetSpecies.dog,
      breed: '말티즈',
      weightKg: 4,
      hasCage: true,
    };

    it('forces isDefault=true for the very first pet, regardless of the input', async () => {
      prisma.pet.count.mockResolvedValue(0);
      prisma.pet.create.mockResolvedValue({ id: 1n });

      await service.create(9n, { ...dto, isDefault: false });

      expect(prisma.pet.updateMany).toHaveBeenCalledWith({
        where: { userId: 9n, isDefault: true },
        data: { isDefault: false },
      });
      expect(prisma.pet.create).toHaveBeenCalledWith({
        data: { userId: 9n, ...dto, isDefault: true },
      });
    });

    it('defaults isDefault=false for a subsequent pet when not specified', async () => {
      prisma.pet.count.mockResolvedValue(1);
      prisma.pet.create.mockResolvedValue({ id: 2n });

      await service.create(9n, dto);

      expect(prisma.pet.updateMany).not.toHaveBeenCalled();
      expect(prisma.pet.create).toHaveBeenCalledWith({
        data: { userId: 9n, ...dto, isDefault: false },
      });
    });

    it('unsets the previous default pet in the same transaction when isDefault=true is requested explicitly', async () => {
      prisma.pet.count.mockResolvedValue(1);
      prisma.pet.create.mockResolvedValue({ id: 3n });

      await service.create(9n, { ...dto, isDefault: true });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.pet.updateMany).toHaveBeenCalledWith({
        where: { userId: 9n, isDefault: true },
        data: { isDefault: false },
      });
      expect(prisma.pet.create).toHaveBeenCalledWith({
        data: { userId: 9n, ...dto, isDefault: true },
      });
    });
  });

  describe('findOwned', () => {
    it('returns the pet when it belongs to the user', async () => {
      prisma.pet.findFirst.mockResolvedValue({ id: 1n, userId: 9n });

      const result = await service.findOwned(9n, 1n);

      expect(prisma.pet.findFirst).toHaveBeenCalledWith({
        where: { id: 1n, userId: 9n },
      });
      expect(result).toEqual({ id: 1n, userId: 9n });
    });

    it('throws NotFoundException when the pet does not exist or belongs to someone else', async () => {
      prisma.pet.findFirst.mockResolvedValue(null);

      await expect(service.findOwned(9n, 1n)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects updating a pet that is not owned by the user', async () => {
      prisma.pet.findFirst.mockResolvedValue(null);

      await expect(service.update(9n, 1n, { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.pet.update).not.toHaveBeenCalled();
    });

    it('updates without a transaction when isDefault is not being set to true', async () => {
      prisma.pet.findFirst.mockResolvedValue({ id: 1n, userId: 9n });
      prisma.pet.update.mockResolvedValue({ id: 1n, name: '새이름' });

      await service.update(9n, 1n, { name: '새이름' });

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.pet.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { name: '새이름' },
      });
    });

    it('unsets the previous default pet in a transaction when isDefault=true is set', async () => {
      prisma.pet.findFirst.mockResolvedValue({ id: 1n, userId: 9n });
      prisma.pet.update.mockResolvedValue({ id: 1n, isDefault: true });

      await service.update(9n, 1n, { isDefault: true });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.pet.updateMany).toHaveBeenCalledWith({
        where: { userId: 9n, isDefault: true },
        data: { isDefault: false },
      });
      expect(prisma.pet.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { isDefault: true },
      });
    });
  });

  describe('remove', () => {
    it('rejects removing a pet that is not owned by the user', async () => {
      prisma.pet.findFirst.mockResolvedValue(null);

      await expect(service.remove(9n, 1n)).rejects.toThrow(NotFoundException);
      expect(prisma.pet.delete).not.toHaveBeenCalled();
    });

    it('deletes the pet once ownership is confirmed', async () => {
      prisma.pet.findFirst.mockResolvedValue({ id: 1n, userId: 9n });
      prisma.pet.delete.mockResolvedValue({ id: 1n });

      await service.remove(9n, 1n);

      expect(prisma.pet.delete).toHaveBeenCalledWith({ where: { id: 1n } });
    });
  });
});
