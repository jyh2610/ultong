import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlacesService, PlacesSearchResult } from './places.service';
import { PlacesSearchQueryDto } from './dto/places-search-query.dto';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('search')
  search(@Query() query: PlacesSearchQueryDto): Promise<PlacesSearchResult> {
    return this.placesService.search(query);
  }
}
