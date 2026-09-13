import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PetSize, PetSpecies } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePetDto {
  @ApiProperty({ maxLength: 50 })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ enum: PetSpecies })
  @IsEnum(PetSpecies)
  species: PetSpecies;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  breed?: string;

  @ApiPropertyOptional({ description: '체중(kg) — 매칭 입력' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  weightKg?: number;

  @ApiPropertyOptional({
    enum: PetSize,
    description: 'ES pet_tags 어휘와 동일',
  })
  @IsOptional()
  @IsEnum(PetSize)
  sizeClass?: PetSize;

  @ApiPropertyOptional({ description: '이동장 소지 여부 — 매칭 입력' })
  @IsOptional()
  @IsBoolean()
  hasCage?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDangerousBreed?: boolean;

  @ApiPropertyOptional({ description: '기본 반려동물로 지정' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
