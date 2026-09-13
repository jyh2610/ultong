import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CodesQueryDto {
  @ApiPropertyOptional({ description: '이 코드의 하위 코드만 조회 (드릴다운)' })
  @IsOptional()
  @IsString()
  parentCode?: string;
}
