import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AddCourseItemDto {
  @ApiProperty({ description: '코스 내 몇 일차인지 (1부터)' })
  @IsInt()
  @Min(1)
  dayNo: number;

  @ApiPropertyOptional({ description: '생략 시 해당 일차의 맨 뒤에 추가' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ description: 'ES pettour-place _id', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  contentId: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleSnapshot?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  memo?: string;
}
