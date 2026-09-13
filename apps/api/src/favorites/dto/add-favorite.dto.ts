import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class AddFavoriteDto {
  @ApiProperty({ description: 'ES pettour-place _id', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  contentId: string;
}
