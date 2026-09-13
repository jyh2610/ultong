import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListReportsQueryDto {
  @ApiPropertyOptional({ description: '특정 시설의 내 제보만 조회' })
  @IsOptional()
  @IsString()
  contentId?: string;
}
