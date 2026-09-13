import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiPropertyOptional({ description: '공개 시 shareSlug가 자동 발급된다' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
