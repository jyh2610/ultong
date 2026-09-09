import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class KakaoLoginDto {
  @ApiProperty({ description: '카카오 SDK로 발급받은 access token' })
  @IsString()
  accessToken: string;
}
