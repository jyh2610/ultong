import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Pet } from '@prisma/client';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('pets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const pets = await this.petsService.list(user.userId);
    return { items: pets.map((pet) => this.toResponse(pet)) };
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreatePetDto) {
    const pet = await this.petsService.create(user.userId, dto);
    return this.toResponse(pet);
  }

  @Get(':id')
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const pet = await this.petsService.findOwned(user.userId, BigInt(id));
    return this.toResponse(pet);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePetDto,
  ) {
    const pet = await this.petsService.update(user.userId, BigInt(id), dto);
    return this.toResponse(pet);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.petsService.remove(user.userId, BigInt(id));
  }

  private toResponse(pet: Pet) {
    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      // Prisma Decimal은 JSON.stringify 시 문자열로 나가므로 숫자로 명시 변환한다.
      weightKg: pet.weightKg === null ? null : Number(pet.weightKg),
      sizeClass: pet.sizeClass,
      hasCage: pet.hasCage,
      isDangerousBreed: pet.isDangerousBreed,
      isDefault: pet.isDefault,
    };
  }
}
