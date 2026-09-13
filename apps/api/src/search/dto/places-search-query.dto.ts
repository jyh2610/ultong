import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { toBoolean } from './query-transforms';

export const MVP_CONTENT_TYPE_IDS = ['12', '14', '28', '32', '39'];

export type PlacesSortOption = 'relevance' | 'recent';

function toStringArray({ value }: { value: unknown }): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',');
  return value;
}

export class PlacesSearchQueryDto {
  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    type: [String],
    default: MVP_CONTENT_TYPE_IDS,
    description: '12관광지 14문화시설 28레포츠 32숙박 39음식점',
  })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  contentTypeId: string[] = MVP_CONTENT_TYPE_IDS;

  @ApiPropertyOptional({ description: '대분류 코드, 예: NA(자연관광)' })
  @IsOptional()
  @IsString()
  lcls1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lcls2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lcls3?: string;

  @ApiPropertyOptional({ description: '법정동 시도 코드' })
  @IsOptional()
  @IsString()
  ldongRegnCd?: string;

  @ApiPropertyOptional({ description: '법정동 시군구 코드' })
  @IsOptional()
  @IsString()
  ldongSignguCd?: string;

  // [비활성화 2026-09-14] 위치정보사업자 신고 회피 — 클라이언트 이관
  // (docs/superpowers/specs/2026-09-14-location-client-side-design.md)
  // 서버는 사용자 좌표를 더 이상 받지 않는다. 거리 계산/반경 필터는 모바일에서
  // expo-location + src/lib/distance.ts(Haversine)로 처리한다.
  //
  // @ApiPropertyOptional()
  // @IsOptional()
  // @Type(() => Number)
  // @IsLatitude()
  // lat?: number;
  //
  // @ApiPropertyOptional()
  // @IsOptional()
  // @Type(() => Number)
  // @IsLongitude()
  // lon?: number;
  //
  // @ApiPropertyOptional()
  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // @IsPositive()
  // radiusKm?: number;

  @ApiPropertyOptional({
    description: '반려견 체중(kg) — 후보 축소용, 최종 판정은 matchVerdict',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  weightKg?: number;

  @ApiPropertyOptional({
    description: '이동장 소지 여부 — matchVerdict 판정에만 사용',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasCage?: boolean;

  @ApiPropertyOptional({ description: '맹견 제외 시설 필터링' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  excludeDangerous?: boolean;

  @ApiPropertyOptional({
    enum: ['relevance', 'recent'],
    default: 'relevance',
  })
  @IsOptional()
  @IsIn(['relevance', 'recent'])
  sort: PlacesSortOption = 'relevance';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size: number = 20;
}
