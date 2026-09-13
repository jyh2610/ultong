import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ description: 'ES pettour-place _id', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  contentId: string;

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiPropertyOptional({ description: '기본값은 오늘 날짜' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  reportedOn?: Date;
}
