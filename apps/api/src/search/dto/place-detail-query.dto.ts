import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { toBoolean } from './query-transforms';

export class PlaceDetailQueryDto {
  @ApiPropertyOptional({
    description: '반려견 체중(kg) — matchVerdict 판정에 사용',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  weightKg?: number;

  @ApiPropertyOptional({
    description: '이동장 소지 여부 — matchVerdict 판정에 사용',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasCage?: boolean;
}
