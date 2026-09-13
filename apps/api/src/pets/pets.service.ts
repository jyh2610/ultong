import { Injectable, NotFoundException } from '@nestjs/common';
import { Pet } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: bigint): Promise<Pet[]> {
    return this.prisma.pet.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
  }

  async create(userId: bigint, dto: CreatePetDto): Promise<Pet> {
    const existingCount = await this.prisma.pet.count({ where: { userId } });
    const isFirstPet = existingCount === 0;
    const isDefault = isFirstPet ? true : (dto.isDefault ?? false);

    if (isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.pet.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
        return tx.pet.create({
          data: { userId, ...dto, isDefault: true },
        });
      });
    }

    return this.prisma.pet.create({
      data: { userId, ...dto, isDefault: false },
    });
  }

  async findOwned(userId: bigint, petId: bigint): Promise<Pet> {
    const pet = await this.prisma.pet.findFirst({
      where: { id: petId, userId },
    });
    if (!pet) throw new NotFoundException('반려동물을 찾을 수 없습니다.');
    return pet;
  }

  async update(userId: bigint, petId: bigint, dto: UpdatePetDto): Promise<Pet> {
    await this.findOwned(userId, petId);

    if (dto.isDefault === true) {
      return this.prisma.$transaction(async (tx) => {
        await tx.pet.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
        return tx.pet.update({ where: { id: petId }, data: dto });
      });
    }

    return this.prisma.pet.update({ where: { id: petId }, data: dto });
  }

  async remove(userId: bigint, petId: bigint): Promise<void> {
    await this.findOwned(userId, petId);
    await this.prisma.pet.delete({ where: { id: petId } });
  }
}
