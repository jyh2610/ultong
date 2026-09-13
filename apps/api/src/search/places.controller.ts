import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlacesService, PlacesSearchResult } from './places.service';
import { PlacesSearchQueryDto } from './dto/places-search-query.dto';
import { PlaceDetailService, PlaceDetail } from './place-detail.service';
import { PlaceDetailQueryDto } from './dto/place-detail-query.dto';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(
    private readonly placesService: PlacesService,
    private readonly placeDetailService: PlaceDetailService,
  ) {}

  // /places/search가 /places/:contentId보다 먼저 매칭되도록 반드시 이 순서로 선언한다.
  @Get('search')
  search(@Query() query: PlacesSearchQueryDto): Promise<PlacesSearchResult> {
    return this.placesService.search(query);
  }

  @Get(':contentId')
  async getDetail(
    @Param('contentId') contentId: string,
    @Query() query: PlaceDetailQueryDto,
  ): Promise<PlaceDetail> {
    const detail = await this.placeDetailService.getDetail(contentId, query);
    if (!detail) {
      throw new NotFoundException('시설을 찾을 수 없습니다.');
    }
    return detail;
  }
}
